"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');

const {selectList, columnsEqualClause, columnsDistinctClause} = require('../darImport/sqlUtil');
const {allColumnNames, nonPrimaryColumnNames} = require('./tableModelUtil');

const createTempDirtyTable = (client, materialization) => {
  const selectClause = selectList(null, materialization.primaryKey);
  return client.query(
    `CREATE TEMP TABLE ${materialization.table}_dirty AS 
     (SELECT ${selectClause} FROM ${materialization.table} WHERE false)`);
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
  const dirtyTable = `${materialization.table}_dirty`;
  const idSelect = selectList(null, materialization.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${materialization.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${materialization.view} NATURAL JOIN ${dirtyTable}`;
  const insertIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from after EXCEPT SELECT ${idSelect} FROM before`;

  const sql = `WITH inserts AS (${insertIdsSql}) INSERT INTO ${materialization.table}_changes (SELECT $1, NULL, 'insert', true, v.* FROM ${materialization.view} v NATURAL JOIN inserts)`;
  return client.query(sql, [txid]);
};

const computeDeletes = (client, txid, tableModels, materialization) => {
  const dirtyTable = `${materialization.table}_dirty`;
  const idSelect = selectList(null, materialization.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${materialization.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${materialization.view} NATURAL JOIN ${dirtyTable}`;
  const deleteIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from before EXCEPT SELECT ${idSelect} FROM after`;

  const sql = `WITH deletes AS (${deleteIdsSql}) INSERT INTO ${materialization.table}_changes (SELECT $1, NULL, 'delete', true, t.* FROM ${materialization.table} t NATURAL JOIN deletes)`;
  return client.query(sql, [txid]);
};

const computeUpdates = (client, txid, tableModels, materialization) => {
  const dirtyTable = `${materialization.table}_dirty`;
  const idSelect = selectList(null, materialization.primaryKey);
  const presentBeforeSql = `SELECT ${idSelect} FROM ${materialization.table} NATURAL JOIN ${dirtyTable}`;
  const presentAfterSql = `SELECT ${idSelect} FROM ${materialization.view} NATURAL JOIN ${dirtyTable}`;
  const possiblyChangedIds = `${presentBeforeSql} INTERSECT ${presentAfterSql}`;
  const changeColumns = nonPrimaryColumnNames(tableModels[materialization.table]);
  const changedColumnClause = columnsDistinctClause('before', 'after', changeColumns);
  const sql =
    `WITH possiblyChanged AS (${possiblyChangedIds}),
     before AS (select ${materialization.table}.* FROM ${materialization.table} NATURAL JOIN possiblyChanged),
     after AS (select ${materialization.view}.* FROM ${materialization.view} NATURAL JOIN possiblyChanged),
     changedIds AS (SELECT ${selectList('before', materialization.primaryKey)} 
  FROM before JOIN after ON ${columnsEqualClause('before', 'after', materialization.primaryKey)}
  WHERE ${changedColumnClause})
   INSERT INTO ${materialization.table}_changes (SELECT $1, NULL, 'update', true, v.* FROM ${materialization.view} v NATURAL JOIN changedIds)
`;
  return client.query(sql, [txid]);
};

module.exports = {
  computeDirty,
  createChangeTable,
  computeInserts,
  computeDeletes,
  computeUpdates,
  createTempDirtyTable
};
