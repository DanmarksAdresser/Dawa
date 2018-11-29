// The replication client uses a different implementation of computeDifferences,
// Because the replication client change tables does not have derived columns, changeids or a public column

const _ = require('underscore');
const { go } = require('ts-csp');

const {allColumnNames, nonPrimaryColumnNames,  makeSelectClause, columnsDistinctClause} = require('@dawadk/import-util/src/table-model-util');

const {selectList, columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');

const computeInserts =
  (client, txid, srcTable, tableModel) => {

    const columnNames = allColumnNames(tableModel);
    const idColumns = tableModel.primaryKey;
    const selectIds = selectList(null, idColumns);
    const selectClause = makeSelectClause('t', tableModel, columnNames);
    const changesColumnList = ['txid', 'operation', columnNames];
    const sql =
      `WITH ids AS 
    (SELECT ${selectIds} FROM ${srcTable} EXCEPT SELECT ${selectIds} FROM ${tableModel.table})
      INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, 'insert', ${selectClause} FROM ${srcTable} t NATURAL JOIN ids)`;
    return client.query(sql);
  };

const computeUpdates =
  (client, txid, sourceTableOrView, tableModel) =>  {
    const nonPrimaryColumnNamesList = nonPrimaryColumnNames(tableModel);
    if (nonPrimaryColumnNamesList.length === 0) {
      return;
    }
    const nonPrimaryColumns = nonPrimaryColumnNamesList.map(columnName => _.findWhere(tableModel.columns, {name: columnName}));
    const changedColumnClause = columnsDistinctClause('before', sourceTableOrView, nonPrimaryColumns);
    const sql =
      `WITH 
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)} 
  FROM ${tableModel.table} before JOIN ${sourceTableOrView} ON ${columnsEqualClause('before', sourceTableOrView, tableModel.primaryKey)}
  ${nonPrimaryColumnNamesList.length > 0 ? `WHERE ${changedColumnClause}` : ''})
   INSERT INTO ${tableModel.table}_changes(txid, operation, ${selectList(null, allColumnNames(tableModel))}) (SELECT ${txid}, 'update', 
   ${selectList(null, allColumnNames(tableModel))} FROM ${sourceTableOrView} NATURAL JOIN changedIds)
`;
    return client.query(sql);
  };

const computeDeletes = (client, txid, srcTable, tableModel) => {
  const selectIds = selectList(null, tableModel.primaryKey);
  const changesColumnList = ['txid', 'operation', ...allColumnNames(tableModel)];
  const selectColumns = selectList('t', allColumnNames(tableModel));
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${tableModel.table} EXCEPT SELECT ${selectIds} FROM ${srcTable})
      INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, 
      'delete', ${selectColumns} FROM ${tableModel.table} t NATURAL JOIN ids)`;
  return client.query(sql);
};

const computeDifferences =
  (client, txid, srcTable, tableModel) => go(function* () {
    yield computeInserts(client, txid, srcTable, tableModel);
    yield computeUpdates(client, txid, srcTable, tableModel);
    yield computeDeletes(client, txid, srcTable, tableModel);
  });

module.exports = {
  computeDifferences
};