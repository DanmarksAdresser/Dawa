const { go } = require('ts-csp');
const path = require('path');
const dar10TableModels = require('../../dar10/dar10TableModels');
const { ALL_DAR_ENTITIES,
  advanceVirkningTime,
  copyEventIdsToFetchTable,
  createFetchTable,
  setMeta,
  setInitialMeta,
  getMaxEventId } = require('../../dar10/import-dar-util');
const streamToTable = require('../../dar10/streamToTable');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');

function ndjsonFileName(entityName) {
  return entityName.replace(new RegExp('å', 'g'), 'aa') + '.ndjson';
}


const copyEntityToTable = (client, entityName, dataDir) => go(function*(){
  const filePath = path.join(dataDir, ndjsonFileName(entityName));
  const tableName = dar10TableModels.rawTableModels[entityName].table;
  const fetchTable = `fetch_${tableName}`;
  yield createFetchTable(client, tableName);
  // Workaround for NavngivenVej:
  // Nogle navngivne veje kommer med z-koordinat for vejnavnelinjen. Det håndterer postgis
  // ikke i kolonner med SRID constraint. Derfor konverterer vi dem til 2D efter indlæsningen
  if(entityName === 'NavngivenVej') {
    yield client.query(`alter table ${fetchTable} alter vejnavnebeliggenhed_vejnavnelinje type geometry`);
  }
  yield streamToTable(client, entityName, filePath, fetchTable, true);
  if(entityName === 'NavngivenVej') {
    yield client.query(`alter table ${fetchTable} alter vejnavnebeliggenhed_vejnavnelinje type geometry(geometry, 25832) USING st_setsrid(st_force2d(vejnavnebeliggenhed_vejnavnelinje), 25832)`);
  }
});
const copyDumpToTables = (client, dataDir) => go(function*() {
    for (let entityName of ALL_DAR_ENTITIES) {
      yield copyEntityToTable(client, entityName, dataDir);
    }
});

const computeEntityDifferences = (client, txid, entityName, eventId) => go(function*(){
  const tableName = dar10TableModels.rawTableModels[entityName].table;
  const fetchTable = `fetch_${tableName}`;
  yield client.queryp(`CREATE UNIQUE INDEX ON ${fetchTable}(rowkey)`);
  // add/expire any rows added/expired after the dump was generated
  yield client.queryp(`INSERT INTO ${fetchTable} (SELECT * FROM ${tableName} 
      WHERE eventOpret > $1 OR eventopdater > $1) 
      ON CONFLICT (rowkey) DO UPDATE SET registrering = EXCLUDED.registrering`, [eventId]);
  // ensure we do not overwite eventopret and eventopdater with NULLs
  // DAR1 may discard them
  yield copyEventIdsToFetchTable(client, fetchTable, tableName);
  yield tableDiffNg.computeDifferences(client, txid, fetchTable, dar10TableModels.rawTableModels[entityName]);
  yield importUtil.dropTable(client, fetchTable);
  yield tableDiffNg.applyChanges(client, txid, dar10TableModels.rawTableModels[entityName]);
  const changes = (yield client.queryRows(`select count(*)::integer as c from ${dar10TableModels.rawTableModels[entityName].table}_changes where txid=$1`, [txid]))[0].c;
  logger.info('Gemte ændringer til rå DAR tabeller', {
    entityName,
    changes
  });
});
const computeDumpDifferences = (client, txid) => go(function*() {
  const eventId = yield getMaxEventId(client, 'fetch_');
  for (let entityName of ALL_DAR_ENTITIES) {
    yield computeEntityDifferences(client, txid, entityName, eventId);
  }
});

function alreadyImported(client) {
  return client.queryp('select * from dar1_adressepunkt limit 1').then(result => result.rows.length > 0);
}

const importInitial = (client, txid, dataDir) => go(function* () {
  yield setInitialMeta(client);
  for (let entityName of ALL_DAR_ENTITIES) {
    const filePath = path.join(dataDir, ndjsonFileName(entityName));
    const tableName = dar10TableModels.rawTableModels[entityName].table;
    yield streamToTable(client, entityName, filePath, tableName, true);
    yield client.query(`ANALYZE ${tableName}`);
  }
  yield advanceVirkningTime(client, txid, ALL_DAR_ENTITIES);
  const maxEventId = yield getMaxEventId(client, '');
  yield setMeta(client, {last_event_id: maxEventId});
});

const importIncremental = (client, txid, dataDir) => go(function*() {
  yield copyDumpToTables(client, dataDir);
  yield computeDumpDifferences(client, txid);
  yield advanceVirkningTime(client, txid, ALL_DAR_ENTITIES);
  const maxEventId = yield getMaxEventId(client, '');
  yield setMeta(client, {last_event_id: maxEventId});
});


module.exports = options => {
  const execute = (client, txid) => go(function*() {
    if(yield alreadyImported(client)) {
      yield importIncremental(client, txid, options.dataDir);
    }
    else {
      yield importInitial(client, txid, options.dataDir);
    }
  });
  return {
    description: 'DAR Download importer',
    execute
  };
};