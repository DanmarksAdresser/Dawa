"use strict";

const { go } = require('ts-csp');
const es = require('event-stream');
const fs = require('fs');
const csvParse = require('csv-parse');
const q = require('q');
const request = require('request-promise');
const url = require('url');

const { withImportTransaction } = require('../importUtil/transaction-util');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const logger = require('@dawadk/common/src/logger').forCategory('heights');
const proddb = require('../psql/proddb');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const schemaModel = require('../psql/tableModel');
const {materializeDawa} = require('../importUtil/materialize-dawa');

const COLUMNS = ['id', 'x', 'y', 'z'];

const CSV_PARSE_OPTIONS = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  columns: true
};

function roundHeight(height) {
  return Math.round(height * 10) / 10;
}

const createHeightTable = (client, tableName) => client.queryp(
  `CREATE TEMP TABLE ${tableName} (
    id uuid NOT NULL PRIMARY KEY,
    x double precision NOT NULL,
    y double precision NOT NULL,
    z double precision NOT NULL)`
);


function streamToTempTable(client, filePath, tableName) {
  return q.async(function*() {
    yield createHeightTable(client, tableName);
    const src = fs.createReadStream(filePath, {encoding: 'utf8'});
    const csvParser = csvParse(CSV_PARSE_OPTIONS);
    const mapper = es.mapSync(csvRow => {
      return {
        id: csvRow.id,
        x: parseFloat(csvRow.x),
        y: parseFloat(csvRow.y),
        z: roundHeight(parseFloat(csvRow.interpolz))
      };
    });
    const stringifier = importUtil.copyStreamStringifier(COLUMNS);
    const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
    yield promisingStreamCombiner([src, csvParser, mapper, stringifier, copyStream]);
  })();
}

const importHeightsFromTable = (client, txid, table) => go(function*() {
  yield client.query('CREATE TEMP TABLE adgangsadresser_dirty AS ' +
    `(SELECT a.id FROM adgangsadresser a 
      JOIN ${table} h 
      ON a.id = h.id AND a.etrs89oest::numeric(11,3) = h.x::numeric(11,3) AND a.etrs89nord::numeric(11,3) = h.y::numeric(11,3)
      AND (a.hoejde is distinct from h.z or (a.z_x is distinct from a.etrs89oest or a.z_y is distinct from a.etrs89nord)))`);
  yield client.query(`CREATE TEMP VIEW adgangsadresser_hoejder AS(select id, z as hoejde FROM ${table})`);
  yield tableDiffNg.computeDifferencesSubset(client, txid, 'adgangsadresser_hoejder', 'adgangsadresser_dirty', schemaModel.tables.adgangsadresser, ["id", "hoejde"]);
  yield tableDiffNg.applyChanges(client, txid, schemaModel.tables.adgangsadresser);
  yield client.queryp(`UPDATE adgangsadresser a SET z_x = etrs89oest, z_y = etrs89nord FROM adgangsadresser_dirty d
    WHERE a.id = d.id`);
  yield client.query('DROP VIEW adgangsadresser_hoejder');
  yield client.query('DROP table adgangsadresser_dirty');
  yield materializeDawa(client, txid);
});

const importHeights = (client, txid, filePath) => go(function*() {
  const tempTable = 'heights';
  yield streamToTempTable(client, filePath, tempTable);
  yield importHeightsFromTable(client, txid, tempTable);
  yield importUtil.dropTable(client, tempTable);
});

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

const importFromApi = (client, apiClient) => go(function*() {
  const rows = (yield client.queryp(`
        SELECT id, etrs89oest as x, etrs89nord as y 
        FROM adgangsadresser 
        WHERE etrs89oest IS NOT NULL AND etrs89nord IS NOT NULL AND 
        (disableheightlookup IS NULL OR disableheightlookup < NOW())  AND
        (z_x IS NULL OR z_y IS NULL OR z_x::numeric(11,3) <> etrs89oest::numeric(11,3) OR z_y::numeric(11,3) <> etrs89nord::numeric(11,3))
        ORDER BY id
        LIMIT 1
        `)).rows;
  if (rows.length === 1) {
    const row = rows[0];
    const id = row.id;
    const x = row.x;
    const y = row.y;
    logger.info('Importerer højde for adgangsadresse', {id, x, y});
    try {
      const z = roundHeight(yield apiClient(x, y));
      logger.info('Modtog højde for adgangsasdresse', {id, x, y, z});
      yield createHeightTable(client, 'heights');
      yield client.query('INSERT INTO heights(id, x, y, z) VALUES ($1, $2, $3, $4)', [id, x, y, z]);
      yield withImportTransaction(client, "importHeightFromApi", (txid) =>
        importHeightsFromTable(client, txid, 'heights')
      );
      logger.info('Højde indlæst for adgangsasdresse', {id, x, y, z});
      yield importUtil.dropTable(client, 'heights');
    }
    catch (e) {
      logger.error('Failed to import height from API', e);
      yield client.queryp(`UPDATE adgangsadresser
          SET disableheightlookup = NOW() + INTERVAL '1 day' WHERE id = $1`, [id]);
    }
    return true;
  }
  else {

    return false;
  }

});

const importFromApiDaemon = (apiUrl, login, password) => go(function*() {
  const apiClient = hoejdeClient(apiUrl, login, password);
  /*eslint no-constant-condition: 0 */
  while (true) {
    const importedAHeight = yield proddb.withTransaction('READ_WRITE', client =>
      importFromApi(client, apiClient));
    if (!importedAHeight) {
      break;
    }
  }
});



module.exports = {
  createHeightTable,
  importHeights,
  importFromApi,
  importFromApiDaemon,
  importHeightsFromTable
};