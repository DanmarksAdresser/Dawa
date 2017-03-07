"use strict";

const { go } = require('ts-csp');
const _ = require('underscore');

const { columnsDistinctClause, selectList, columnsEqualClause } = require('../darImport/sqlUtil');
const allColumnNames = tableModel => tableModel.columns.map(col => col.name);

const nonPrimaryColumnNames = tableModel =>
  allColumnNames(tableModel).filter(column => !tableModel.primaryKey.includes(column));

const insert = (client, tableModel, object) => {
  const columns = [];
  const values = [];
  const valueClauses = [];
  for(let column of allColumnNames(tableModel)) {
    if(typeof object[column] !== 'undefined') {
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
  for(let column of nonPrimaryColumnNames(tableModel)) {
    const value = object[column];
    if(typeof value === 'undefined') {
      continue;
    }
    values.push(value);
    const parameter = `$${values.length}`;
    updateClauses.push(`${column} = ${parameter}`);
  }
  for(let column of tableModel.primaryKey) {
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
  for(let column of tableModel.primaryKey) {
    values.push(key[column]);
    whereClauses.push(`${column} = $${values.length}`);
  }
  return client.query(`DELETE FROM ${tableModel.table} WHERE ${whereClauses.join(' AND ')}`, values);
};

const deriveColumns = (client, table, tableModel, additionalWhereClauses) => go(function*() {
  for(let column of tableModel.columns) {
    if(column.derive) {
      yield column.derive(client, table, additionalWhereClauses);
    }
  }
});

const deriveColumnsForChange = (client, txid, tableModel) => go(function*() {
  const additionalWhereClauses = alias => `${alias}.txid = ${txid} AND (${alias}.operation = 'insert' or ${alias}.operation = 'update')`;
  yield deriveColumns(client, `${tableModel.table}_changes`, tableModel, additionalWhereClauses);
});

const assignSequenceNumbers = (client, txid, tableModel, operations) => go(function*() {

  const hasNonpublicFields = _.some(tableModel.columns, c => c.public === false);
  const publicColumnNames = tableModel.columns
    .filter(c => c.public !== false)
    .map(c => c.name);
  const table = tableModel.table;
  const changeTable = `${table}_changes`;
  for(let op of operations) {
    const seqSelectId = selectList('c', tableModel.primaryKey);
    let  seqFromClause = `${changeTable} c`;
    let seqWhereClause =  `txid = ${txid} AND operation='${op}'`;
    if(hasNonpublicFields) {
      seqFromClause += ` LEFT JOIN ${table} t ON ${columnsEqualClause('c', 't', tableModel.primaryKey)}`
      seqWhereClause += ` AND ${columnsDistinctClause('t', 'c', publicColumnNames)}`;
    }
    const selectSeq =
      `SELECT ${seqSelectId}, row_number() over () as s FROM ${seqFromClause} WHERE ${seqWhereClause}`;
    const sql = `WITH seq AS (${selectSeq}),
                      last_seq AS (select coalesce(max(sequence_number), 0) FROM transaction_history)
                 UPDATE ${changeTable} 
                 SET changeid = s + (select * from last_seq) 
                 FROM seq 
                 WHERE ${columnsEqualClause('seq', changeTable, tableModel.primaryKey)}`;
    yield client.queryBatched(sql);
  }
});

module.exports = {
  allColumnNames,
  nonPrimaryColumnNames,
  insert,
  update,
  del,
  deriveColumns,
  deriveColumnsForChange,
  assignSequenceNumbers
};
