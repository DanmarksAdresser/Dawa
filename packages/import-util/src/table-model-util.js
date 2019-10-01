"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {selectList, columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');
const { name, distinctClause } = require('./table-diff-protocol');
const allColumnNames = tableModel => tableModel.columns.map(name);

const derivedColumnNames = tableModel => tableModel.columns.filter(col => !!col.derive).map(col => col.name);

const isPrimaryColumn = (colName, tableModel) => tableModel.primaryKey.includes(colName);

const nonPrimaryColumnNames = tableModel =>
  allColumnNames(tableModel).filter(column => !isPrimaryColumn(column, tableModel));

const publicColumnNames = tableModel =>
  tableModel.columns
    .filter(col => col.public !== false)
    .map(col => col.name);

const publicNonKeyColumnNames = tableModel =>
  publicColumnNames(tableModel)
    .filter(colName => !isPrimaryColumn(colName, tableModel));

const assignSequenceNumbers = (client, txid, tableModel, op) => go(function*() {
  const table = tableModel.table;
  const changeTable = `${table}_changes`;
  const hasChanges = (yield client.queryRows(`select * from ${changeTable} where txid = ${txid} and operation = '${op}' limit 1`)).length > 0;
  if(!hasChanges) {
    return;
  }
  const seqSelectId = selectList('c', tableModel.primaryKey);
  let seqFromClause = `${changeTable} c`;
  let seqWhereClause = `txid = ${txid} AND operation='${op}' AND public`;
  const selectLastSeq =`select coalesce(max(sequence_number), 0) as last_seq FROM transaction_history`;
  const selectSeq =
    `SELECT ${seqSelectId}, last_seq+row_number() over () as s FROM ${seqFromClause}, (${selectLastSeq}) last_seq WHERE ${seqWhereClause}`;
  yield client.query(`create temp table tmp_seq as (${selectSeq})`);
  yield client.query(`UPDATE ${changeTable} 
                            SET changeid = s 
                            FROM tmp_seq 
                            WHERE ${columnsEqualClause('tmp_seq', changeTable, tableModel.primaryKey)}AND ${changeTable}.txid = ${txid}`);
  yield client.query(`INSERT INTO transaction_history(sequence_number, entity, operation, txid) 
                   (SELECT s, '${tableModel.entity || tableModel.table}', '${op}', ${txid} FROM tmp_seq)`);
  yield client.query(`drop table tmp_seq`);
});

const insert = (client, tableModel, object) => {
  const columns = [];
  const values = [];
  const valueClauses = [];
  for (let column of allColumnNames(tableModel)) {
    if (typeof object[column] !== 'undefined') {
      columns.push(column);
      values.push(object[column]);
      valueClauses.push(`$${values.length}`);
    }
  }
  return client.query(
    `INSERT INTO ${tableModel.table}(${columns.join(', ')})
    VALUES (${valueClauses.join(', ')})`, values);
};

const update = (client, tableModel, object) => {
  const values = [];
  const updateClauses = [];
  const whereClauses = [];
  for (let column of nonPrimaryColumnNames(tableModel)) {
    const value = object[column];
    if (typeof value === 'undefined') {
      continue;
    }
    values.push(value);
    const parameter = `$${values.length}`;
    updateClauses.push(`${column} = ${parameter}`);
  }
  for (let column of tableModel.primaryKey) {
    const value = object[column];
    values.push(value);
    const parameter = `$${values.length}`;
    whereClauses.push(`${column} = ${parameter}`);
  }
  return client.query(
    `UPDATE ${tableModel.table} SET ${updateClauses.join(',')}
     WHERE ${whereClauses.join(' AND ')}`, values);
};

const del = (client, tableModel, key) => {
  const values = [];
  const whereClauses = [];
  for (let column of tableModel.primaryKey) {
    values.push(key[column]);
    whereClauses.push(`${column} = $${values.length}`);
  }
  return client.query(`DELETE FROM ${tableModel.table} WHERE ${whereClauses.join(' AND ')}`, values);
};

const deriveColumn = (client, table, tableModel, columnName, additionalWhereClauses) => {
  const column = _.findWhere(tableModel.columns, {name: columnName});
  let sql = `UPDATE ${table} SET ${column.name} = ${column.derive(table)}`;
  if (additionalWhereClauses) {
    sql += ` WHERE ${additionalWhereClauses(table)}`;
  }
  return client.query(sql);
};

const deriveColumns = (client, table, tableModel, additionalWhereClauses) => go(function*() {
  for (let column of tableModel.columns) {
    if (column.derive) {
      yield deriveColumn(client, table, tableModel, column.name, additionalWhereClauses);
    }
  }
});

const deriveColumnsForChange = (client, txid, tableModel) => go(function*() {
  const additionalWhereClauses = alias => `${alias}.txid = ${txid} AND (${alias}.operation = 'insert' or ${alias}.operation = 'update')`;
  yield deriveColumns(client, `${tableModel.table}_changes`, tableModel, additionalWhereClauses);
});

const nonDerivedColumnNames = tableModel => _.difference(allColumnNames(tableModel), derivedColumnNames(tableModel));

const columnsDistinctClause = (tableA, tableB, columns) =>
  '(' + columns.map(column => distinctClause(column, `${tableA}.${name(column)}`, `${tableB}.${name(column)}`)).join(') OR (') + ')';

module.exports = {
  allColumnNames,
  derivedColumnNames,
  nonDerivedColumnNames,
  nonPrimaryColumnNames,
  insert,
  update,
  del,
  deriveColumn,
  deriveColumns,
  deriveColumnsForChange,
  assignSequenceNumbers,
  publicColumnNames,
  publicNonKeyColumnNames,
  columnsDistinctClause
};
