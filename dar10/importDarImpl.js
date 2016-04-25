"use strict";

const path = require('path');
const q = require('q');
const _ = require('underscore');

const darTablediff = require('./darTablediff');
const importUtil = require('../importUtil/importUtil');
const tablediff = require('../importUtil/tablediff');
const postgresMapper = require('./postgresMapper');

const sqlUtil = require('../darImport/sqlUtil');
const streamToTable = require('./streamToTable');

const selectList = sqlUtil.selectList;

const entities = ['Adresse'];

function importInitial(client, dataDir) {
  return q.async(function*() {
    for (let entityName of entities) {
      const filePath = path.join(dataDir, entityName + '.ndjson');
      const tableName = postgresMapper.tables[entityName];
      yield streamToTable(client, entityName, filePath, tableName, true);
    }
  })();
}

function importIncremental(client, dataDir, eventId) {
  return withDar1Transaction(client, () => {
    return q.async(function*() {
      for (let entityName of entities) {
        const columns = postgresMapper.columns[entityName];
        const filePath = path.join(dataDir, entityName + '.ndjson');
        const tableName = postgresMapper.tables[entityName];
        const desiredTableName = `desired_${tableName}`;
        yield client.queryp(`create temp table ${desiredTableName} (LIKE ${tableName})`);
        yield streamToTable(client, entityName, filePath, desiredTableName, true);
        yield darTablediff.computeDifferences(client, desiredTableName, tableName, columns, eventId);
        yield darTablediff.logChanges(client, entityName, tableName);
        yield darTablediff.applyChanges(client, tableName, columns);
        yield tablediff.dropChangeTables(client, tableName);
        yield importUtil.dropTable(desiredTableName);
      }
    })();
  });
}

function fetchTableColumns(entityName) {
  const columns = postgresMapper.columns[entityName];
  return _.without(columns, 'eventopret', 'eventopdater').concat('eventid');

}

function createFetchedTable(client, entityName, fetchedTable) {
  const columns = fetchTableColumns(entityName);
  const table = postgresMapper.columns[entityName];
  return client.queryBatched(`CREATE TEMP TABLE  ${fetchedTable} AS
     select ${_.without(columns, 'eventid').join(', ')}, 1 as eventid FROM ${table} WHERE false`);
}

function createFetchTables(client, changeset) {
  return q.async(function*() {
    for(let entityName of Object.keys(changeset)) {
      yield createFetchedTable(client, entityName, `fetched_${postgresMapper.tables[entityName]}`);
    }
  })();
}

function storeChangesetInFetchTables(client, changeset) {
  return q.async(function*() {
    yield createFetchTables(client, changeset);
    for(let entityName of Object.keys(changeset)) {
      const rows = changeset[entityName];
      const targetTable = postgresMapper.tables[entityName];
      // TODO validate against correct schema
      const mappedRows = rows.map(postgresMapper.createMapper(entityName, false));
      const fetchedTable = `fetched_${targetTable}`;
      const fetchColumns = fetchTableColumns(entityName);
      yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, fetchColumns);
    }
  })();
}

function applyFetchTables(client, entityNames) {
  return q.async(function*() {
    for(let entityName of Object.keys(entityNames)) {
      const table = postgresMapper.tables[entityName];
      const fetchTable = `fetched_${table}`;
      const allColumns = postgresMapper.columns[entityName];
      const regularColumns = _.without(allColumns, 'eventopret', 'eventopdater');
      // Vi antager at opdateringer overholder de givne invarianter, dvs.:
      // 1. Rækker uden registreringtil er nye rækker som skal indsættes
      // 2. Rækker med registreringtil er eksisterende rækker som skal opdateres,
      //    og det er kun nødvendigt at opdatere eventopdater og registrering kolonnerne
      yield client.queryBatched(`INSERT INTO ${table}(eventopret, ${regularColumns.join(', ')}) (SELECT eventid, ${selectList(null, regularColumns)} FROM ${fetchTable} WHERE upper(registrering) IS NULL)`);
      yield client.queryBatched(`UPDATE ${table} SET eventopdater = eventid, registrering = ${fetchTable}.registrering FROM ${fetchTable} WHERE ${fetchTable}.rowkey = ${table}.rowkey`);
      // TODO log changes
    }
  })();
}

function computeChangedDawaObjects(client, changedDarEntityNames) {
  return q.async(function*() {
    yield client.queryBatched(`CREATE TEMP TABLE changed_vejstykker(kommunekode smallint, vejkode smallint, primary key(kommunekode, vejkode))`);
    yield client.queryBatched('CREATE TEMP TABLE changed_adgangsadresser(id uuid PRIMARY KEY)');
    yield client.queryBatched('CREATE TEMP TABLE changed_enhedsadresser(id uuid PRIMARY KEY)');
    if(_.contains(changedDarEntityNames, 'NavngivenVejKommunedel')) {
      yield client.queryBatched(`INSERT INTO changed_vejstykker(kommunekode, vejkode)
      (SELECT distinct kommune as kommunekode, vejkode FROM fetched_${postgresMapper.tables.NavngivenVejKommunedel})`);
    }
    if(_.contains(changedDarEntityNames, 'Husnummer')) {
      yield client.queryBatched(`INSERT INTO changed_adgangsadresser (SELECT distinct id FROM fetched_${postgresMapper.tables.Husnummer})`);
    }
    if(_.contains(changedDarEntityNames, 'AdressePunkt')) {
      yield client.queryBatched(`INSERT INTO changed_adgangsadresser (SELECT distinct hn.id FROM fetched_${postgresMapper.tables.AdressePunkt} ap JOIN Husnummer hn ON hn.adgangspunkt_id = ap.id WHERE hn.id NOT IN (SELECT id from changed_adgangsadresser))`);
    }
    if(_.contains(changedDarEntityNames, 'Adresse')) {
      yield client.queryBatched(`INSERT INTO changed_enhedsadresser (SELECT distinct id FROM fetched_${postgresMapper.tables.Adresse})`);
    }
    for(let table of ['changed_vejstykker', 'changed_adgangsadresser', 'changed_enhedsadresser']) {
      yield client.queryBatched(`ANALYZE ${table}`);
    }
  })();
}

function dropFetchTables(client, entityNames) {
  return q.async(function*() {
    for(let entityName of entityNames) {
      yield client.queryBatched(`DROP TABLE fetched_${postgresMapper.tables[entityName]}`);
    }
  })();
}

function importChangeset(client, changeset) {
  return q.async(function*() {
    yield storeChangesetInFetchTables(client, changeset);
    yield applyFetchTables(client, Object.keys(changeset));
    yield computeChangedDawaObjects(client, Object.keys(changeset));
    yield dropFetchTables(client, Object.keys(changeset));

  })();
}

function withDar1Transaction(client, fn) {
  return q.async(function*() {
    yield client.queryp("update dar1_tx_current set tx_current= COALESCE( (SELECT max(id)+1 from dar1_transaction), 1)");
    yield fn();
    yield client.queryp("insert into dar1_transaction(id, ts) VALUES ( (SELECT COALESCE(max(id), 0)+1 from dar1_transaction), NOW())");
    yield client.queryp("update dar1_tx_current set tx_current = NULL");
  })();
}

module.exports = {
  importInitial: importInitial,
  importIncremental: importIncremental,
  withDar1Transaction: withDar1Transaction,
  importChangeset: importChangeset
};
