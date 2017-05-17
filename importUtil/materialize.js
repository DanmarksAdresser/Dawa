"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');

const {selectList} = require('../darImport/sqlUtil');
const {computeInsertsSubset, computeUpdatesSubset, computeDeletesSubset, applyChanges, initializeFromScratch} = require('./tableDiffNg');
const {enableTriggersQ, disableTriggersQ} = require('../psql/common');
const schemaModel = require('../psql/tableModel');

const createTempDirtyTable = (client, materialization) => {
  const selectClause = selectList(null, materialization.primaryKey);
  return client.query(
    `CREATE TEMP TABLE ${materialization.table}_dirty AS 
     (SELECT ${selectClause} FROM ${materialization.table} WHERE false)`);
};

const dropTempDirtyTable = (client, materialization) => {
  return client.query(`DROP TABLE ${materialization.table}_dirty`);
};

/**
 * Compute dirty rows for a materialization
 * @param client
 * @param txid transaction ID
 * @param tablemodels collection of tableModels referenced in materialization
 * @param materialization description of the materialized view
 * @param srcTable the table in which dirty rows are found. May be a view.
 * @param targetTable table to store dirty rows. Only keys are stored.
 */
const computeDirtyPart = (client, txid, tablemodels, materialization, srcTable, targetTable) => {
  return go(function*() {
    const matKeySelect = materialization.primaryKey.map(col => `t.${col}`).join(', ');
    const dirtySelects = materialization.dependents.map(dependent => {
      const dependentTableModel = tablemodels[dependent.table];
      assert.isObject(dependentTableModel);
      const dependentKey = dependentTableModel.primaryKey;
      assert.isArray(dependentKey);
      assert.strictEqual(dependentKey.length, dependent.columns.length);
      const joinClause = dependent.columns.map((column, index) => {
        const pkColumn = dependentKey[index];
        return `t.${column} = c.${pkColumn}`;
      }).join(' AND ');
      return `SELECT ${matKeySelect} FROM ${srcTable} t JOIN ${dependent.table}_changes c ON ${joinClause} and txid = ${txid}`;
    });
    const sql = `INSERT INTO ${targetTable} (${dirtySelects.join(' UNION ')})`;
    yield client.query(sql);
  });
};

const computeDirty = (client, txid, tablemodels, materialization) => go(function*() {
  yield createTempDirtyTable(client, materialization);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.table,
    `${materialization.table}_dirty`);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.view,
    `${materialization.table}_dirty`);
});


const createChangeTable = (client, srcTableName) => go(function*() {
  const changeTableName = `${srcTableName}_changes`;
  yield client.query(
    `CREATE TABLE ${changeTableName} as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, ${srcTableName}.* FROM ${srcTableName} WHERE false);
     ALTER TABLE ${changeTableName} ALTER COLUMN txid SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN operation SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN public SET NOT NULL;
     CREATE INDEX ON ${changeTableName}(txid, operation);
     CREATE INDEX ON ${changeTableName}(changeid, public)`);
});

const computeInserts = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  return computeInsertsSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel);
};

const computeDeletes = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  return computeDeletesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel);
};


const computeUpdates = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  return computeUpdatesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel);
};

const computeChanges = (client, txid, tableModels, materialization) => go(function*() {
  yield computeInserts(client, txid, tableModels, materialization);
  yield computeUpdates(client, txid, tableModels, materialization);
  yield computeDeletes(client, txid, tableModels, materialization);
});

const materialize = (client, txid, tableModels, materialization) => go(function*() {
  yield computeDirty(client, txid, tableModels, materialization);
  yield computeChanges(client, txid, tableModels, materialization);
  yield applyChanges(client, txid, tableModels[materialization.table]);
  yield dropTempDirtyTable(client, materialization);
});

const materializeDawa = (client, txid) => go(function*() {
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adresser_mat);
});

const recomputeMaterializedDawa = (client, txid) => go(function*() {
  for(let table of ['adgangsadresser_mat', 'adresser_mat']) {
    const model = schemaModel.materializations[table];
    if(!model) {
      throw new Error('No table model for ' + schemaModel);
    }
    yield disableTriggersQ(client);
    yield client.query(`delete from ${table}; delete from ${table}_changes`);
    yield initializeFromScratch(client, txid, model.view, schemaModel.tables[table]);
    yield enableTriggersQ(client);
  }
});

module.exports = {
  computeDirty,
  createChangeTable,
  computeInserts,
  computeDeletes,
  computeUpdates,
  createTempDirtyTable,
  materialize,
  materializeDawa,
  recomputeMaterializedDawa
};
