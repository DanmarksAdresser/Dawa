"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');
const _ = require('underscore');

const {selectList, columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');
const {
  computeInsertsSubset, computeUpdatesSubset, computeDeletesSubset, applyChanges,
  initializeFromScratch, computeDifferences, applyCurrentTableToChangeTable
} = require('@dawadk/import-util/src/table-diff');


const createTempDirtyTable = (client, tableModel) => {
  const selectClause = selectList(null, tableModel.primaryKey);
  return client.query(
    `CREATE TEMP TABLE ${tableModel.table}_dirty AS 
     (SELECT ${selectClause} FROM ${tableModel.table} WHERE false)`);
};

const dropTempDirtyTable = (client, tableModel) => {
  return client.query(`DROP TABLE ${tableModel.table}_dirty`);
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
  return go(function* () {
    const tableModel = tablemodels[materialization.table];
    const matKeySelect = tableModel.primaryKey.map(col => `t.${col}`).join(', ');
    const dirtySelects = materialization.dependents.map(dependent => {
      const dependentTableModel = tablemodels[dependent.table];
      assert(dependentTableModel, `dependent table ${dependent.table} exists for materialization ${materialization.table}`);
      const references = dependent.references || dependentTableModel.primaryKey;
      assert.isObject(dependentTableModel);
      assert.isArray(references);
      assert.strictEqual(references.length, dependent.columns.length);
      const joinClause = dependent.columns.map((column, index) => {
        const pkColumn = references[index];
        return `t.${column} = c.${pkColumn}`;
      }).join(' AND ');
      return `SELECT ${matKeySelect} FROM ${srcTable} t JOIN ${dependent.table}_changes c ON ${joinClause} and txid = ${txid}`;
    });
    const sql = `INSERT INTO ${targetTable} (${dirtySelects.join(' UNION ')})`;
    yield client.query(sql);
  });
};

const computeDirty = (client, txid, tablemodels, materialization) => go(function* () {
  const tableModel = tablemodels[materialization.table];
  yield createTempDirtyTable(client, tableModel);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.table,
    `${materialization.table}_dirty`);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.view,
    `${materialization.table}_dirty`);
  yield client.query(`ANALYZE ${materialization.table}_dirty`);
});


const createChangeTable = (client, srcTableName) => go(function* () {
  const changeTableName = `${srcTableName}_changes`;
  yield client.query(
    `CREATE TABLE ${changeTableName} as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, ${srcTableName}.* FROM ${srcTableName} WHERE false);
     ALTER TABLE ${changeTableName} ALTER COLUMN txid SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN operation SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN public SET NOT NULL;
     CREATE INDEX ON ${changeTableName}(txid, operation);
     CREATE INDEX ON ${changeTableName}(changeid, public)`);
});

const computeMaterializedColumns = (tableModel, materialization) => {
  const excludedColumns = materialization.excludedColumns || [];
  const allColumns = tableModel.columns.map(col => col.name);
  return _.difference(allColumns, excludedColumns);
};

const computeInserts = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  return computeInsertsSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel, includedColumns);
};

const computeDeletes = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  return computeDeletesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel);
};


const computeUpdates = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  return computeUpdatesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel, includedColumns);
};

const computeChanges = (client, txid, tableModels, materialization) => go(function* () {
  yield computeInserts(client, txid, tableModels, materialization);
  yield computeUpdates(client, txid, tableModels, materialization);
  yield computeDeletes(client, txid, tableModels, materialization);
});

const materialize = (client, txid, tableModels, materialization) => go(function* () {
  const tableModel = tableModels[materialization.table];

  assert(tableModel);
  if(materialization.computeDirty) {
    yield createTempDirtyTable(client, tableModel);
    yield materialization.computeDirty(client, txid);
  }
  else {
    yield computeDirty(client, txid, tableModels, materialization);
  }
  yield computeChanges(client, txid, tableModels, materialization);
  yield applyChanges(client, txid, tableModel);
  yield dropTempDirtyTable(client, tableModel);
});

/**
 * clear contents and history of materialized table and rematerialize it
 */
const clearAndMaterialize = (client, txid, tablemodels, materialization) => go(function* () {
  const model = tablemodels[materialization.table];
  yield client.query(`DELETE FROM ${materialization.table}; DELETE FROM ${materialization.table}_changes`);
  yield initializeFromScratch(client, txid, materialization.view, model);
  yield client.query(`ANALYZE ${materialization.table}`);
});

const recomputeMaterialization = (client, txid, tableModels, materialization) => go(function* () {
  yield client.query(`create temp table desired as (SELECT * FROM ${materialization.view})`);
  yield client.query(`ANALYZE desired`);
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  yield computeDifferences(client, txid, 'desired', tableModels[materialization.table], includedColumns);
  yield client.query(`analyze ${materialization.table}_changes`);
  yield client.query('DROP TABLE desired');
  yield applyChanges(client, txid, tableModels[materialization.table]);
});


const makeChangesNonPublic = (client, txid, tableModel) =>
  client.query(`UPDATE ${tableModel.table}_changes SET public=false WHERE txid = $1`, [txid]);

/**
 * updates columns of materialization *without* producing any events.
 * The most recent event for each present row is updated.
 * Does not produce any inserts or deletes. Does not handle derived rows.
 */
const materializeWithoutEvents = (client, tableModels, materialization, columnNames) => go(function*() {
  const tableModel = tableModels[materialization.table];
  yield client.query(`UPDATE ${materialization.table} t
  SET ${columnNames.map(col => `${col} = v.${col}`).join(', ')} 
  FROM ${materialization.view} v 
  WHERE ${columnsEqualClause('t', 'v', tableModel.primaryKey)}`);
  yield applyCurrentTableToChangeTable(client, tableModel, columnNames);
});

module.exports = {
  computeDirty,
  createChangeTable,
  computeInserts,
  computeDeletes,
  computeUpdates,
  computeChanges,
  materialize,
  clearAndMaterialize,
  recomputeMaterialization,
  dropTempDirtyTable,
  makeChangesNonPublic,
  materializeWithoutEvents
};
