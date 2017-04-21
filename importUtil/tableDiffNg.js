"use strict";

const { go } = require('ts-csp');
const _ = require('underscore');

const {allColumnNames, nonPrimaryColumnNames, publicColumnNames, publicNonKeyColumnNames, deriveColumnsForChange, makeSelectClause, derivedColumnNames, nonDerivedColumnNames} = require('./tableModelUtil');
const {selectList, columnsEqualClause, columnsDistinctClause} = require('../darImport/sqlUtil');

/**
 */
const computeInserts =  (client, txid, srcTable, tableModel, columnNames) => {
  columnNames = columnNames ? _.union(columnNames, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const dstTable = tableModel.table;
  const idColumns = tableModel.primaryKey;
  const selectIds =  selectList(null, idColumns);
  const selectClause = makeSelectClause('t', tableModel, columnNames);
  const changesColumnList = ['txid', 'changeid', 'operation', 'public', columnNames];
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${srcTable} EXCEPT SELECT ${selectIds} FROM ${dstTable})
      INSERT INTO ${dstTable}_changes(${changesColumnList.join(', ')}) (SELECT ${txid}, NULL, 'insert', true, ${selectClause} FROM ${srcTable} t NATURAL JOIN ids)`;
  return client.query(sql);
};

const computeInsertsSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, columnNames) => {
  columnNames = columnNames ? _.union(columnNames, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const selectClause = makeSelectClause('v', tableModel, columnNames);
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const insertIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from after EXCEPT SELECT ${idSelect} FROM before`;
  const sql = `WITH inserts AS (${insertIdsSql}) INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, columnNames)}) (SELECT $1, 'insert', true, ${selectClause} FROM ${sourceTableOrView} v NATURAL JOIN inserts)`;
  return client.query(sql, [txid]);

};

const makePublicClause = (client, tableModel) =>  {
  const hasNonpublicFields = _.some(tableModel.columns, c => c.public === false);
  if(!hasNonpublicFields) {
    return 'true'
  }
  return columnsDistinctClause('before', 'after', publicNonKeyColumnNames(tableModel));
};

const computeUpdatesSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, nonPreservedColumns) => go(function*() {
  nonPreservedColumns = nonPreservedColumns ? _.union(nonPreservedColumns, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const columnsFromSource = _.difference(nonPreservedColumns, derivedColumnNames(tableModel));
  const idSelect = selectList(null, tableModel.primaryKey);
  const presentBeforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const presentAfterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const possiblyChangedIds = `${presentBeforeSql} INTERSECT ${presentAfterSql}`;
  const changedColumnClause = columnsDistinctClause('before', 'after', nonPrimaryColumnNames(tableModel));
  const publicClause = makePublicClause(client, tableModel);
  const preservedColumns = _.difference(allColumnNames(tableModel), nonPreservedColumns);
  let rawAfterPreservedSelectClause = selectList('raw_after', columnsFromSource);
  if(preservedColumns.length > 0) {
    rawAfterPreservedSelectClause += ', ' + selectList('before', preservedColumns);
  }
  const sql =
    `WITH possiblyChanged AS (${possiblyChangedIds}),
     before AS (select ${selectList(tableModel.table, allColumnNames(tableModel))} FROM ${tableModel.table} NATURAL JOIN possiblyChanged),
     raw_after AS (select ${selectList(sourceTableOrView, columnsFromSource)} FROM ${sourceTableOrView} NATURAL JOIN possiblyChanged),
     raw_after_preserved AS (SELECT ${rawAfterPreservedSelectClause}
                            FROM before JOIN raw_after ON ${columnsEqualClause('before', 'raw_after', tableModel.primaryKey)}),
     after AS (SELECT ${makeSelectClause('raw_after_preserved', tableModel, allColumnNames(tableModel))}  FROM raw_after_preserved),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}, ${publicClause} as is_public 
  FROM before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  WHERE ${changedColumnClause})
   INSERT INTO ${tableModel.table}_changes (SELECT ${txid}, NULL, 'update', is_public, ${selectList(null, allColumnNames(tableModel))} FROM after NATURAL JOIN changedIds)
`;
  yield client.query(sql);
});

/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
const computeUpdates = (client, txid, sourceTableOrView, tableModel, nonPreservedColumns) => go(function*() {
  nonPreservedColumns = nonPreservedColumns ? _.union(nonPreservedColumns, derivedColumnNames(tableModel)) : allColumnNames(tableModel);
  const columnsFromSource = _.difference(nonPreservedColumns, derivedColumnNames(tableModel));
  const changedColumnClause = columnsDistinctClause('before', 'after', nonPrimaryColumnNames(tableModel));
  const publicClause = makePublicClause(client, tableModel);
  const preservedColumns = _.difference(allColumnNames(tableModel), nonPreservedColumns);
  let rawAfterPreservedSelectClause = selectList('raw_after', columnsFromSource);
  if(preservedColumns.length > 0) {
    rawAfterPreservedSelectClause += ', ' + selectList('before', preservedColumns);
  }
  const sql =
    `WITH 
     raw_after AS (select ${selectList(sourceTableOrView, columnsFromSource)} FROM ${sourceTableOrView}),
     raw_after_preserved AS (SELECT ${rawAfterPreservedSelectClause}
                            FROM ${tableModel.table} before JOIN raw_after ON ${columnsEqualClause('before', 'raw_after', tableModel.primaryKey)}),
     after AS (SELECT ${makeSelectClause('raw_after_preserved', tableModel, allColumnNames(tableModel))} FROM raw_after_preserved),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}, ${publicClause} as is_public 
  FROM ${tableModel.table} before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  WHERE ${changedColumnClause})
   INSERT INTO ${tableModel.table}_changes (SELECT ${txid}, NULL, 'update', is_public, ${selectList(null, allColumnNames(tableModel))} FROM after NATURAL JOIN changedIds)
`;
  yield client.query(sql);
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
  return client.query(sql);
};

const computeDeletesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel) => {
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${srcTableOrView} NATURAL JOIN ${dirtyTable}`;
  const deleteIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from before EXCEPT SELECT ${idSelect} FROM after`;

  const sql = `WITH deletes AS (${deleteIdsSql}) 
  INSERT INTO ${tableModel.table}_changes(txid, operation, public, ${selectList(null, allColumnNames(tableModel))})
  (SELECT ${txid}, 'delete', true, ${selectList('t', allColumnNames(tableModel))} FROM ${tableModel.table} t NATURAL JOIN deletes)`;
  return client.query(sql);
};



const computeDifferences =
  (client, txid, srcTable, tableModel, columns) => go(function*() {
  yield computeInserts(client, txid, srcTable, tableModel, columns);
  yield computeUpdates(client, txid, srcTable, tableModel, columns);
  yield computeDeletes(client, txid, srcTable, tableModel);
});

const computeDifferencesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel, columns) => go(function*() {
  yield computeInsertsSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeUpdatesSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeDeletesSubset(client, txid, srcTableOrView, dirtyTable, tableModel);
});

const applyInserts = (client, txid, tableModel) => go(function*() {
  const columnList = selectList(null, allColumnNames(tableModel));
  yield client.query(`INSERT INTO ${tableModel.table}(${columnList}) (SELECT ${columnList} FROM ${tableModel.table}_changes WHERE txid = ${txid} and operation = 'insert')`);
});

const applyDeletes = (client, txid, tableModel) => go(function*() {
  yield client.query(`DELETE FROM ${tableModel.table} t USING ${tableModel.table}_changes c WHERE c.txid = ${txid} AND operation='delete' AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
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

const createChangeTable = (client, tableModel) => go(function*() {
  const selectFields = selectList(null, allColumnNames(tableModel));
  const selectKeyClause = selectList(null, tableModel.primaryKey);
  const changeTableName = `${tableModel.table}_changes`;
  yield client.query(`DROP TABLE IF EXISTS ${changeTableName} CASCADE`);
  yield client.query(`CREATE TABLE ${changeTableName} AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, ${selectFields} FROM ${tableModel.table} WHERE false)`);
  yield client.query(`CREATE INDEX ON ${changeTableName}(${selectKeyClause}, changeid desc NULLS LAST)`);
  yield client.query(`CREATE INDEX ON ${changeTableName}(changeid desc NULLS LAST) `);
  yield client.query(`CREATE INDEX ON ${changeTableName}(txid) `);
});

const migrateInserts = (client, txid, tableModel) => {
  const selectFields = selectList(null, publicColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  const historyTableName = `${tableModel.table}_history`;
  const sql = `WITH inserts AS (SELECT
                   valid_from,
                   ${selectFields}
                 FROM ${historyTableName} h
                 WHERE valid_from IS NULL OR NOT EXISTS
                 (SELECT *
                  FROM ${historyTableName} h2
                  WHERE h2.valid_to = h.valid_from))
INSERT INTO ${changeTableName} (txid, changeid, operation, public, ${selectFields})
  (SELECT
     ${txid},
     valid_from,
     'insert',
     TRUE,
     ${selectFields}
   FROM inserts)`;
  return client.query(sql);
};

const migrateUpdates = (client, txid, tableModel) => {
  const selectFields = selectList(null, publicColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  const historyTableName = `${tableModel.table}_history`;
  const sql = `WITH updates AS
(SELECT
   valid_from,
   ${selectFields}
 FROM ${historyTableName} h
 WHERE valid_from IS NOT NULL AND EXISTS
 (SELECT *
  FROM ${historyTableName} h2
  WHERE h2.valid_to = h.valid_from))
INSERT INTO ${changeTableName} (txid, changeid, operation, public, ${selectFields})
  (SELECT
     ${txid},
     valid_from,
     'update',
     TRUE,
     ${selectFields}
   FROM updates)`;
  return client.query(sql);
};

const migrateDeletes = (client, tid, tableModel) => {
  const selectFields = selectList(null, publicColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  const historyTableName = `${tableModel.table}_history`;
  const sql = `WITH deletes AS (select valid_to, ${selectFields}
FROM ${historyTableName} h
WHERE valid_to IS NOT NULL AND NOT EXISTS
(SELECT *
 FROM ${historyTableName} h2
 WHERE h2.valid_from = h.valid_to))
INSERT INTO ${changeTableName} (txid, changeid, operation, public, ${selectFields})
  (SELECT
     1,
     valid_to,
     'delete',
     TRUE,
     ${selectFields}
   FROM deletes)`;
  return client.query(sql);
};

const migrateHistoryToChangeTable = (client, txid, tableModel) => go(function*() {
  yield migrateInserts(client, txid, tableModel);
  yield migrateUpdates(client, txid, tableModel);
  yield migrateDeletes(client, txid, tableModel);
});

const initializeFromScratch = (client, txid, sourceTableOrView, tableModel, columns) => go(function*() {
  columns = columns || nonDerivedColumnNames(tableModel);
  const selectFields = selectList(null, columns);
  const changeTableName = `${tableModel.table}_changes`;
  const sql = `INSERT INTO ${changeTableName}(txid, changeid, operation, public, ${selectFields}) 
  (SELECT ${txid}, null, 'insert', false, ${selectFields} FROM ${sourceTableOrView})`;
  yield client.query(sql);
  yield deriveColumnsForChange(client, txid, tableModel);
  yield applyChanges(client, txid, tableModel);
});


module.exports = {
  computeInserts,
  computeInsertsSubset,
  computeUpdates,
  computeUpdatesSubset,
  computeDeletes,
  computeDeletesSubset,
  computeDifferences,
  computeDifferencesSubset,
  applyInserts,
  applyUpdates,
  applyDeletes,
  applyChanges,
  migrateHistoryToChangeTable,
  createChangeTable,
  initializeFromScratch
};
