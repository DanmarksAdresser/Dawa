"use strict";

var child_process = require('child_process');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var q = require('q');

const ejerlav = require('./ejerlav');
const importing = require('../apiSpecification/flats/importing');
const importUtil = require('../importUtil/importUtil');
const logger = require('../logger').forCategory('matrikelImport');

function parseEjerlavkode(file) {
  var ejerlav_regex = /^([\d]+)_.*$/g;
  var match = ejerlav_regex.exec(file);
  return parseInt(match[1], 10);
}

function getLastUpdated(client, ejerlavkode) {
  return client.queryp("select lastupdated FROM ejerlav_ts WHERE ejerlavkode = $1", [ejerlavkode]).then(function(result) {
    if(!result.rows || result.rows.length === 0) {
      return null;
    }
    return moment(result.rows[0].lastupdated).valueOf();
  });
}

function setLastUpdated(client, ejerlavkode, millisecondsSinceEpoch) {
  var secondsSinceEpoch = millisecondsSinceEpoch / 1000;
  return getLastUpdated(client, ejerlavkode).then(function(lastUpdated) {
    if(lastUpdated) {
      return client.queryp('UPDATE ejerlav_ts SET lastupdated = to_timestamp($2) WHERE ejerlavkode = $1', [ejerlavkode, secondsSinceEpoch]);
    }
    else {
      return client.queryp('INSERT INTO ejerlav_ts(ejerlavkode, lastupdated) VALUES ($1, to_timestamp($2))', [ejerlavkode, secondsSinceEpoch]);
    }
  });
}

function importEjerlav(client, srcDir, file, initial, skipModificationCheck) {
  return q.async(function*() {
    var stats = fs.statSync(path.join(srcDir, file));
    var ctimeMillis = stats.mtime.getTime();

    const ejerlavkode = parseEjerlavkode(file);
    const lastUpdatedMillis = yield getLastUpdated(client, ejerlavkode);
    if(!skipModificationCheck) {
      if (lastUpdatedMillis && lastUpdatedMillis >= ctimeMillis) {
        logger.debug('Skipping ejerlav, not modified', { ejerlavkode: ejerlavkode });
        return;
      }
    }
    const unzipBuffer = yield q.nfcall(child_process.exec, "unzip -p " + file,
      {
        cwd: srcDir,
        maxBuffer: 1024 * 1024 * 128
      }
    );
    const gml = unzipBuffer.toString('utf-8');
    // For some crazy reason, we get a single comma "," in stdout, when the
    // ZIP-file does not contain a gml file. We consider any output less than
    // 10 chars to be "no data".
    if(gml.trim().length < 10) {
      logger.error('Ejerlav fil for ejerlav ' + ejerlavkode + ' indeholdt ingen data');
      return;
    }

    const jordstykker = yield ejerlav.parseEjerlav(gml);

    jordstykker.forEach(function (jordstykke) {
      if (jordstykke.fields.ejerlavkode !== ejerlavkode) {
        throw new Error("Ejerlavkode for jordstykket matchede ikke ejerlavkode for filen");
      }
    });

    for(let jordstykke of jordstykker) {
      if(jordstykke.polygons.length > 1) {
        throw new Error('Jordstykke med mere end 1 polygon ikke tilladt');
      }
    }
    const rows = jordstykker.map(jordstykke => Object.assign({}, jordstykke.fields, {geom: 'SRID=25832;' + jordstykke.polygons[0]}));

    const createSubsetTableFn = fetchTable => {
      return q.async(function*() {
        yield client.queryp(`CREATE TEMP TABLE dirty_jordstykker AS (
          (select ejerlavkode, matrikelnr from ${fetchTable}) UNION 
          (select ejerlavkode, matrikelnr FROM jordstykker where ejerlavkode = $1))`, [ejerlavkode]);
        return 'dirty_jordstykker';
      })();
    };

    yield importing.importFlat(client, 'jordstykke', importUtil.streamArray(rows), [], initial, null, createSubsetTableFn, true);

    yield setLastUpdated(client, ejerlavkode, ctimeMillis);

    logger.info('successfully updated ejerlav', {ejerlavkode: ejerlavkode});
  })();
}

function doImport(db, srcDir, initial, refresh) {
  return q.async(function*() {
    const files = fs.readdirSync(srcDir).filter(function(file) {
      return /^.+\.zip$/.test(file);
    });
    for(let file of files) {
      yield db.withTransaction('READ_WRITE', function(client) {
        return importEjerlav(client, srcDir, file, initial, refresh);
      });
    }
    if(refresh) {
      yield db.withTransaction('READ_WRITE',
        client => importing.refreshAdgangsadresserRelation(client, 'jordstykke'));
    }
  })();
}

module.exports = {
  doImport,
  importEjerlav
};
