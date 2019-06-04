"use strict";

const { go } = require('ts-csp');
var child_process = require('child_process');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var q = require('q');

const ejerlavFns = require('../../matrikeldata/ejerlav');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const logger = require('@dawadk/common/src/logger').forCategory('matrikelImport');
const {streamArrayToTable} = require('@dawadk/import-util/src/postgres-streaming');
const tableSchema = require('../../psql/tableModel');
const {
  name
} = require('@dawadk/import-util/src/table-diff-protocol');


const jordstykkeColumns = ['ejerlavkode', 'matrikelnr', 'kommunekode', 'sognekode',
  'regionskode', 'retskredskode', 'esrejendomsnr', 'udvidet_esrejendomsnr', 'sfeejendomsnr',
  'featureid', 'moderjordstykke', 'registreretareal', 'arealberegningsmetode', 'vejareal', 'vejarealberegningsmetode', 'vandarealberegningsmetode', 'fælleslod'];


const matrikelJordstykkeTableModel = tableSchema.tables.matrikel_jordstykker;
const ejerlavColumns = ['kode', 'navn'];
const ejerlavTableModel = tableSchema.tables.ejerlav;

const streamJordstykkerToTable = (client, rows, table) => streamArrayToTable(client, rows, table,
  [...jordstykkeColumns, 'geom']);

const streamEjerlavToTable = (client, rows, table) => streamArrayToTable(client, rows, table, [...ejerlavColumns, 'geom']);

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

  const { ejerlav, jordstykker} = yield ejerlavFns.parseEjerlav(gml);

  jordstykker.forEach(function (jordstykke) {
    if (jordstykke.ejerlavkode !== ejerlavkode) {
      throw new Error("Ejerlavkode for jordstykket matchede ikke ejerlavkode for filen");
    }
  });
  yield streamEjerlavToTable(client, ejerlav, 'desired_ejerlav');
  yield streamJordstykkerToTable(client, jordstykker, 'desired_jordstykker');
  const allJordstykkerColumns = matrikelJordstykkeTableModel.columns.map(column => name(column));
  const allEjerlavColumns = ejerlavTableModel.columns.map(column => name(column));
  yield client.query(`INSERT INTO actual_jordstykker(${allJordstykkerColumns.join(', ')}) 
  (SELECT ${allJordstykkerColumns.join(', ')} FROM matrikel_jordstykker WHERE ejerlavkode = $1)`,
    [ejerlavkode]);

  yield client.query(`INSERT INTO actual_ejerlav(${allEjerlavColumns.join(', ')}) 
  (SELECT ${allEjerlavColumns.join(', ')} FROM ejerlav WHERE kode = $1)`,
    [ejerlavkode]);

  yield setLastUpdated(client, ejerlavkode, ctimeMillis);
  logger.info('successfully updated ejerlav', {ejerlavkode: ejerlavkode});
});

const importJordstykkerImpl = (client, txid, srcDir, refresh) => go(function*() {
  yield client.query(`CREATE TEMP TABLE desired_jordstykker AS (SELECT matrikel_jordstykker.* FROM matrikel_jordstykker WHERE false);
  ALTER TABLE desired_jordstykker ALTER geom TYPE text;
  CREATE TEMP TABLE desired_ejerlav AS (select ejerlav.* from ejerlav where false);
  ALTER TABLE desired_ejerlav ALTER geom TYPE text;`);
  yield client.query(`CREATE TEMP TABLE actual_jordstykker AS (SELECT matrikel_jordstykker.* FROM matrikel_jordstykker WHERE false)`);
  yield client.query(`CREATE TEMP TABLE actual_ejerlav AS (SELECT ejerlav.* FROM ejerlav WHERE false)`);
  const files = fs.readdirSync(srcDir).filter(function (file) {
    return /^.+\.zip$/.test(file);
  });
  for(let file of files) {
    yield streamEjerlav(client, srcDir, file, refresh);
  }
  yield client.query(`alter table desired_jordstykker alter column geom type geometry(polygon, 25832) using st_geomfromgml(geom, 25832)`);
  yield client.query(`alter table desired_ejerlav alter column geom type geometry(multipolygon, 25832) using st_multi(st_geomfromgml(geom, 25832))`);
  yield tableDiffNg.computeDifferencesView(client, txid, 'desired_jordstykker', 'actual_jordstykker', matrikelJordstykkeTableModel);
  yield tableDiffNg.computeDifferencesView(client, txid, 'desired_ejerlav', 'actual_ejerlav', ejerlavTableModel);
  yield tableDiffNg.applyChanges(client, txid, matrikelJordstykkeTableModel);
  yield tableDiffNg.applyChanges(client, txid, ejerlavTableModel);
  yield client.query('drop table desired_jordstykker; drop table desired_ejerlav; drop table actual_ejerlav; drop table actual_jordstykker; analyze matrikel_jordstykker; analyze matrikel_jordstykker_changes;');
});

const createMatrikelImporter = ({srcDir, refresh}) => {
  return {
    id: 'Cadastre-importer',
    description: 'Matrikelkort-importer',
    requires: [],
    produces: ['ejerlav', 'matrikel_jordstykker'],
    execute: (client, txid) => importJordstykkerImpl(client, txid, srcDir, refresh)
  };
};

module.exports = {
  streamEjerlav,
  createMatrikelImporter
};
