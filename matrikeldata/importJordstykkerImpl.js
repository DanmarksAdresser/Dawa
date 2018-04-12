"use strict";

const { go } = require('ts-csp');
var child_process = require('child_process');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var q = require('q');

const ejerlav = require('./ejerlav');
const tableDiffNg = require('../importUtil/tableDiffNg');
const { recomputeMaterialization } = require('../importUtil/materialize');
const logger = require('../logger').forCategory('matrikelImport');
const {streamArrayToTable} = require('../importUtil/importUtil');
const tableSchema = require('../psql/tableModel');
const {
  updateGeometricFields
} = require('../importUtil/geometryImport');


const jordstykkeColumns = ['ejerlavkode', 'matrikelnr', 'kommunekode', 'sognekode', 'regionskode', 'retskredskode', 'esrejendomsnr', 'udvidet_esrejendomsnr', 'sfeejendomsnr'];
const jordstykkeTableModel = tableSchema.tables.jordstykker;

const streamJordstykkerToTable = (client, rows, table) => streamArrayToTable(client, rows, table,
  [...jordstykkeColumns, 'geom']);

function parseEjerlavkode(file) {
  var ejerlav_regex = /^([\d]+)_.*$/g;
  var match = ejerlav_regex.exec(file);
  return parseInt(match[1], 10);
}

function getLastUpdated(client, ejerlavkode) {
  return client.queryp("select lastupdated FROM ejerlav_ts WHERE ejerlavkode = $1", [ejerlavkode]).then(function (result) {
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return moment(result.rows[0].lastupdated).valueOf();
  });
}

function setLastUpdated(client, ejerlavkode, millisecondsSinceEpoch) {
  var secondsSinceEpoch = millisecondsSinceEpoch / 1000;
  return getLastUpdated(client, ejerlavkode).then(function (lastUpdated) {
    if (lastUpdated) {
      return client.queryp('UPDATE ejerlav_ts SET lastupdated = to_timestamp($2) WHERE ejerlavkode = $1', [ejerlavkode, secondsSinceEpoch]);
    }
    else {
      return client.queryp('INSERT INTO ejerlav_ts(ejerlavkode, lastupdated) VALUES ($1, to_timestamp($2))', [ejerlavkode, secondsSinceEpoch]);
    }
  });
}

const streamEjerlav = (client, srcDir, file, skipModificationCheck) => go(function* () {
  var stats = fs.statSync(path.join(srcDir, file));
  var ctimeMillis = stats.mtime.getTime();

  const ejerlavkode = parseEjerlavkode(file);
  const lastUpdatedMillis = yield getLastUpdated(client, ejerlavkode);
  if (!skipModificationCheck) {
    if (lastUpdatedMillis && lastUpdatedMillis >= ctimeMillis) {
      logger.debug('Skipping ejerlav, not modified', {ejerlavkode: ejerlavkode});
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
  if (gml.trim().length < 10) {
    logger.error('Ejerlav fil for ejerlav ' + ejerlavkode + ' indeholdt ingen data');
    return;
  }

  const rows = yield ejerlav.parseEjerlav(gml);

  rows.forEach(function (jordstykke) {
    if (jordstykke.ejerlavkode !== ejerlavkode) {
      throw new Error("Ejerlavkode for jordstykket matchede ikke ejerlavkode for filen");
    }
  });
  yield streamJordstykkerToTable(client, rows, 'desired_jordstykker');
  yield client.query(`INSERT INTO actual_jordstykker(${jordstykkeColumns.join(', ')}, geom) 
  (SELECT ${jordstykkeColumns.join(', ')}, geom FROM jordstykker WHERE ejerlavkode = $1)`,
    [ejerlavkode]);

  yield setLastUpdated(client, ejerlavkode, ctimeMillis);
  logger.info('successfully updated ejerlav', {ejerlavkode: ejerlavkode});
});

const importJordstykkerImpl = (client, txid, srcDir, refresh) => go(function*() {
  yield client.query(`CREATE TEMP TABLE desired_jordstykker AS (SELECT ${jordstykkeColumns.join(',')}, geom FROM jordstykker WHERE false)`);
  yield client.query(`CREATE TEMP TABLE actual_jordstykker AS (SELECT ${jordstykkeColumns.join(',')}, geom FROM jordstykker WHERE false)`);
  const files = fs.readdirSync(srcDir).filter(function (file) {
    return /^.+\.zip$/.test(file);
  });
  for(let file of files) {
    yield streamEjerlav(client, srcDir, file, refresh);
  }
  yield tableDiffNg.computeDifferencesView(client, txid, 'desired_jordstykker', 'actual_jordstykker', jordstykkeTableModel, [...jordstykkeColumns, 'geom']);
  yield updateGeometricFields(client, txid, jordstykkeTableModel);
  yield tableDiffNg.applyChanges(client, txid, jordstykkeTableModel);
  yield client.query('drop table desired_jordstykker; drop table actual_jordstykker; analyze jordstykker; analyze jordstykker_changes;');
  yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.jordstykker_adgadr);
  yield client.query('delete from jordstykker_changes');
});

module.exports = {
  importJordstykkerImpl
};
