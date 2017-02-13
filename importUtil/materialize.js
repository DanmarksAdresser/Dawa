"use strict";

const { assert } = require('chai');
const { go } = require('ts-csp');

const { selectList } = require('../darImport/sqlUtil');
const { allColumnNames } = require('./tableModelUtil');

const computeDirty = (client, txid, tablemodels, materialization, srcTable, targetTable) => {
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

const applyInserts = (client, txid, tableName, tableModel) => go(function*() {
  const columnList = selectList(null, allColumnNames(tableModel));
  yield client.queryp(`INSERT INTO ${tableName}(${columnList}) (SELECT ${columnList} FROM ${tableName}_changes WHERE txid = $1 and operation = 'insert')`, [txid]);
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

module.exports = { computeDirty, createChangeTable };
