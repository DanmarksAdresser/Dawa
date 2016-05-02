"use strict";

const es = require('event-stream');
const fs = require('fs');
const csvParse = require('csv-parse');
const q = require('q');
const request = require('request-promise');
const url = require('url');

const importUtil = require('../importUtil/importUtil');
const logger = require('../logger').forCategory('heights');
const proddb = require('../psql/proddb');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const sqlCommon = require('../psql/common');

const COLUMNS = ['id', 'x', 'y', 'z'];

const CSV_PARSE_OPTIONS = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  columns: true
};


function streamToTempTable(client, filePath, tableName) {
  return q.async(function*() {
    yield client.queryp(`CREATE TABLE ${tableName} (
    id uuid NOT NULL PRIMARY KEY,
    x double precision NOT NULL,
    y double precision NOT NULL,
    z double precision NOT NULL)`);
    const src = fs.createReadStream(filePath, {encoding: 'utf8'});
    const csvParser = csvParse(CSV_PARSE_OPTIONS);
    const mapper = es.mapSync(csvRow => {
      return {
        id: csvRow.id,
        x: parseFloat(csvRow.x),
        y: parseFloat(csvRow.y),
        z: parseFloat(csvRow.interpolz)
      };
    });
    const stringifier = importUtil.copyStreamStringifier(COLUMNS);
    const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
    yield promisingStreamCombiner([src, csvParser, mapper, stringifier, copyStream]);
  })();
}

function importHeights(client, filePath, initial) {
  return q.async(function*() {
    const tempTable = 'heights';
    yield streamToTempTable(client, filePath, tempTable);
    if (initial) {
      yield sqlCommon.disableTriggersQ(client);
    }
    yield client.queryp(
      `UPDATE adgangsadresser a SET hoejde = h.z 
      FROM heights h
      WHERE h.id = a.id AND h.x = a.etrs89oest AND h.y = etrs89nord`);
    if (initial) {
      yield client.queryp(
        `UPDATE adgangsadresser_history a SET hoejde = h.z 
      FROM heights h
      WHERE h.id = a.id AND h.x = a.etrs89oest AND h.y = etrs89nord AND a.valid_to IS NULL`);
      yield sqlCommon.enableTriggersQ(client);
    }
    //yield importUtil.dropTable(client, tempTable);
  })();
}

function hoejdeClient(apiUrl, login, password) {
  return function (x, y) {
    const parsedUrl = url.parse(apiUrl, true);
    parsedUrl.query.login = login;
    parsedUrl.query.password = password;
    parsedUrl.query.geop = `${x},${y}`;
    delete parsedUrl.search;
    const formattedUrl = url.format(parsedUrl);
    return request.get({
      url: formattedUrl,
      json: true
    }).then(result => {
      if (result.hoejde === null || result.hoejde === undefined) {
        logger.error('Got bad result from height service', {
          result: result,
          url: formattedUrl
        });
        throw new Error(result);
      }
      return result.hoejde;
    });
  }
}

function importFromApi(client, apiClient) {
  return q.async(function*() {
    const rows = (yield client.queryp(`SET enable_seqscan=0;
        SELECT id, etrs89oest as x, etrs89nord as y 
        FROM adgangsadresser 
        WHERE etrs89oest IS NOT NULL AND etrs89nord IS NOT NULL AND 
        (disableheightlookup IS NULL OR disableheightlookup < NOW())  AND
        (z_x IS NULL OR z_y IS NULL OR z_x <> etrs89oest OR z_y <> etrs89nord)
        ORDER BY id
        LIMIT 1
        `)).rows;
    yield client.queryp('SET enable_seqscan=1');
    if (rows.length === 1) {
      const row = rows[0];
      const id = row.id;
      const x = row.x;
      const y = row.y;
      try {
        const z = yield apiClient(x, y);
        yield client.queryp(
          'UPDATE adgangsadresser SET z_x = $1, z_y = $2, hoejde=$3 WHERE id=$4',
          [x, y, z, id]);
      }
      catch (e) {
        yield client.queryp(`UPDATE adgangsadresser
          SET disableheightlookup = NOW() + INTERVAL '1 day' WHERE id = $1`, [id]);
      }
      return true;
    }
    else {
      return false;
    }
  })();
}

function importFromApiDaemon(apiUrl, login, password) {
  return q.async(function*() {
    const apiClient = hoejdeClient(apiUrl, login, password);
    /*eslint no-constant-condition: 0 */
    while (true) {
      const importedAHeight = yield proddb.withTransaction('READ_WRITE', client => {
        return importFromApi(client, apiClient);
      });
      if (!importedAHeight) {
        yield q.delay(5000);
      }
    }
  })();
}


module.exports = {
  importHeights: importHeights,
  importFromApi: importFromApi,
  importFromApiDaemon: importFromApiDaemon
};
