"use strict";

const q = require('q');
const path = require('path');

const bitemporal = require('./bitemporal');
const postgresMapper = require('./postgresMapper');

const streamToTable = require('./streamToTable');

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
        yield bitemporal.computeDifferences(client, desiredTableName, tableName, columns, eventId);
        yield bitemporal.logChanges(client, entityName, tableName);
        yield bitemporal.applyChanges(client, tableName, columns);
        yield dropChangeTables(client, tableName);
      }
    })();
  });
}

function withDar1Transaction(client, fn) {
  return q.async(function*() {
    yield client.queryp("update dar1_tx_current set tx_current= COALESCE( (SELECT max(id)+1 from dar1_transaction), 1)");
    yield fn();
    yield client.queryp("insert into dar1_transaction(id, ts) VALUES ( (SELECT COALESCE(max(id), 0)+1 from dar1_transaction), NOW())");
    yield client.queryp("update dar1_tx_current set tx_current = NULL");
  })();
}

function dropTable(client, tableName) {
  return client.queryp('DROP TABLE ' + tableName,[]);
}


function dropChangeTables(client, tableSuffix) {
  return q.async(function*() {
    for(let prefix of ['insert_', 'update_', 'delete_']) {
      yield dropTable(client, prefix + tableSuffix);
    }
  })();
}


module.exports = {
  importInitial: importInitial,
  importIncremental: importIncremental,
  withDar1Transaction: withDar1Transaction,
  dropChangeTables: dropChangeTables
};
