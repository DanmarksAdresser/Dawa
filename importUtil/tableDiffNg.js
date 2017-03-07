"use strict";

const { go } = require('ts-csp');

const {allColumnNames, nonPrimaryColumnNames} = require('./tableModelUtil');
const {selectList, columnsEqualClause, columnsDistinctClause} = require('../darImport/sqlUtil');

/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
const computeInserts =  (client, txid, srcTable, tableModel) => {
  const dstTable = tableModel.table;
  const idColumns = tableModel.primaryKey;
  const selectIds =  selectList(null, idColumns);
  const selectColumns = selectList('t', allColumnNames(tableModel));
  const changesColumnList = ['txid', 'changeid', 'operation', 'public', ...allColumnNames(tableModel)];
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${srcTable} EXCEPT SELECT ${selectIds} FROM ${dstTable})
      INSERT INTO ${dstTable}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, NULL, 'insert', true, ${selectColumns} FROM ${srcTable} t NATURAL JOIN ids)`;
  return client.queryBatched(sql);
};

/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
const computeUpdates = (client, txid, srcTable, tableModel) => go(function*() {
  const dstTable = tableModel.table;
  const columnsToCheck = nonPrimaryColumnNames(tableModel);
  if(columnsToCheck.length === 0) {
    return
  }

  const idEqualsClause =  columnsEqualClause('s', 'd', tableModel.primaryKey);
  const nonIdColumnsDifferClause = columnsDistinctClause('s', 'd', columnsToCheck);
  const changesColumnList = ['txid', 'changeid', 'operation', 'public', ...allColumnNames(tableModel)];
  const selectColumns = selectList('s', allColumnNames(tableModel));

  yield client.queryBatched(
    `INSERT INTO  ${dstTable}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, NULL, 'update', true, ${selectColumns}
       FROM ${srcTable} s 
       JOIN ${dstTable} d ON ${idEqualsClause}
       WHERE ${nonIdColumnsDifferClause})`);
});

const computeDeletes = (client, txid, srcTable, tableModel) => {
  const dstTable = tableModel.table;
  const selectIds =  selectList(null, tableModel.primaryKey);
  const changesColumnList = ['txid', 'changeid', 'operation', 'public', ...allColumnNames(tableModel)];
  const selectColumns = selectList('t', allColumnNames(tableModel));
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${dstTable} EXCEPT SELECT ${selectIds} FROM ${srcTable})
      INSERT INTO ${dstTable}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, NULL, 'delete', true, ${selectColumns} FROM ${dstTable} t NATURAL JOIN ids)`;
  return client.queryBatched(sql);
};


const computeDifferences =
  (client, txid, srcTable, tableModel) => go(function*() {
  yield computeInserts(client, txid, srcTable, tableModel);
  yield computeUpdates(client, txid, srcTable, tableModel);
  yield computeDeletes(client, txid, srcTable, tableModel);
});

const applyInserts = (client, txid, tableModel) => go(function*() {
  const columnList = selectList(null, allColumnNames(tableModel));
  yield client.query(`INSERT INTO ${tableModel.table}(${columnList}) (SELECT ${columnList} FROM ${tableModel.table}_changes WHERE txid = ${txid} and operation = 'insert')`);
});

const applyDeletes = (client, txid, tableModel) => go(function*() {
  yield client.query(`DELETE FROM ${tableModel.table} t USING ${tableModel.table}_changes c WHERE c.txid = ${txid} AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
});

const applyUpdates = (client, txid, tableModel) => go(function*() {
  const columnsToUpdate = nonPrimaryColumnNames(tableModel);
  const updateClause = columnsToUpdate.map(column => `${column} = c.${column}`).join(', ');
  yield client.query(`UPDATE ${tableModel.table} t SET ${updateClause} FROM ${tableModel.table}_changes c WHERE c.txid = ${txid} AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
});

const applyChanges = (client, txid, tableModel) => go(function*() {
  yield applyDeletes(client, txid, tableModel);
  yield applyUpdates(client, txid, tableModel);
  yield applyInserts(client, txid, tableModel);
});


module.exports = {
  computeInserts,
  computeUpdates,
  computeDeletes,
  computeDifferences,
  applyInserts,
  applyUpdates,
  applyDeletes,
  applyChanges
};
