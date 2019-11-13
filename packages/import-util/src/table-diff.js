"use strict";

/**
 * This file provides functionality to compare two SQL relations (tables or views) and compare the differences between the two,
 * that is, the inserts, updates and deletes to perform to make them equal.
 *
 * This functionality is the very basis of the DAWA replication API as well as all the data processing happening during import of data.
 *
 * The functions computeDifferences and applyChanges are the key part of the API. There are generally used when importing files.
 * Typically, the file is streamed to the database into a temporary table, which is then compared.
 *
 * The function computeDifferencesSubset computes changes on a subset of data. The subset must be stored
 * in a "dirty" table containing primary keys of any rows that has potentially changed.
 *
 */
const { assert } = require('chai');
const {go} = require('ts-csp');

const {allColumnNames, nonPrimaryColumnNames,
  deriveColumnsForChange, assignSequenceNumbers, columnsDistinctClause} = require('./table-model-util');
const {selectList, columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');
const { streamArrayToTable} = require('./postgres-streaming');

const {name, derive, isPublic, preApplyChanges, postApplyChanges, fromSource, compare} =
  require('@dawadk/import-util/src/table-diff-protocol');

const createSourceTable = (client, tableModel, sourceTableName) => {
  const columnNames = tableModel.columns.filter(isPublic).map(name);
  return client.query(`CREATE TEMP TABLE ${sourceTableName} AS (SELECT ${columnNames.join(', ')} FROM ${tableModel.table})`);
};

const createDirtyTable = (client, tableModel, dirtyTableName) => {
  const columnNames = tableModel.columns.map(name).filter( columnName => tableModel.primaryKey.includes(columnName));
  return client.query(`CREATE TEMP TABLE ${dirtyTableName} AS (SELECT ${columnNames.join(', ')} FROM ${tableModel.table})`);
};

const  createIncrementalDifferences = (client, txid, tableModel, puts, deletes) => go(function*() {
  yield createSourceTable(client, tableModel, 'desired');
  yield createDirtyTable(client, tableModel, 'dirty');
  const publicColumnNames = tableModel.columns.filter(isPublic).map(name);
  yield streamArrayToTable(client, puts, 'desired', publicColumnNames);
  yield streamArrayToTable(client, deletes, 'dirty', tableModel.primaryKey);
  yield client.query(`INSERT INTO dirty(${tableModel.primaryKey.join(',')}) (SELECT ${tableModel.primaryKey.join(', ')} FROM desired)`);
  yield computeDifferencesSubset(client, txid, 'desired', 'dirty', tableModel);
  yield client.query('drop table desired');
  yield client.query('drop table dirty');
});

const applyCurrentTableToChangeTable = (client, tableModel, columnsToApply) => {
  return client.query(`WITH rowsToUpdate AS (SELECT ${selectList('t', tableModel.primaryKey)}, ${selectList('t', columnsToApply)},txid,changeid
  FROM ${tableModel.table} t JOIN LATERAL (select txid, changeid FROM ${tableModel.table}_changes c WHERE
  ${columnsEqualClause('t', 'c', tableModel.primaryKey)} 
   ORDER BY txid DESC NULLS LAST, changeid DESC NULLS LAST limit 1) c ON true)
UPDATE ${tableModel.table}_changes c  SET ${columnsToApply.map(column => `${column} = u.${column}`).join(',')} FROM rowsToUpdate u
WHERE ${columnsEqualClause('c', 'u', tableModel.primaryKey)} AND u.txid = c.txid AND u.changeid IS NOT DISTINCT FROM c.changeid;`);
};

/**
 *
 */
const columnsForSelectClause = (tableModel) =>
  tableModel.columns.filter(column => derive(column) || fromSource(column));


/**
 * Make a select clause that either selects or derives columns from source table
 * @param alias
 * @param tableModel
 */
const makeSelectClause = (table, tableModel) => {
  return columnsForSelectClause(tableModel).map(column => {
    if(derive(column)) {
      return `${derive(column)(table)} as ${name(column)}`;
    }
    else {
      return `${table}.${name(column)}`
    }
  }).join(', ');
};

/**
 * generate insert statement inserting the rows specified by primary key in the table idTable.
 */
const insertSql = (txid, tableModel, srcTable, idTable) => {
  const selectClause = makeSelectClause('t', tableModel);
  const changesColumnList = ['txid', 'operation', columnsForSelectClause(tableModel).map(name)];
  return `INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) 
    (SELECT ${txid}, 'insert', ${selectClause} FROM ${srcTable} t NATURAL JOIN ${idTable})`
};

const computeInsertsView =
  (client, txid, srcTable, dstTable, tableModel, columnNames) => {
  assert(columnNames === undefined);

    const idColumnNames = tableModel.primaryKey;
    const selectIds = selectList(null, idColumnNames);
    const sql =
      `WITH ids AS 
    (SELECT ${selectIds} FROM ${srcTable} EXCEPT SELECT ${selectIds} FROM ${dstTable})
      ${insertSql(txid, tableModel, srcTable, 'ids')}`;
    return client.query(sql);
  };


/**
 */
const computeInserts = (client, txid, srcTable, tableModel, columnNames) =>
  computeInsertsView(client, txid, srcTable, tableModel.table, tableModel, columnNames);

const computeInsertsSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, columnNames) => {
  assert(columnNames === undefined);
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const insertIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from after EXCEPT SELECT ${idSelect} FROM before`;
  const sql = `WITH ids AS (${insertIdsSql}) 
    ${insertSql(txid, tableModel, sourceTableOrView, 'ids')}`;
  return client.query(sql);

};

const setPublic = (client, txid, tableModel)=> go(function*() {
  const publicColumns = tableModel.columns.filter(c => isPublic(c));
  const publicClause = columnsDistinctClause('c', 't', publicColumns);
  yield client.query(`
      UPDATE ${tableModel.table}_changes set public = true where txid = ${txid} AND (operation = 'insert' OR operation = 'delete');
      UPDATE ${tableModel.table}_changes c SET public = ${publicClause}
      FROM ${tableModel.table} t
      WHERE c.txid = ${txid} AND operation = 'update' AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
});

const insertUpdatesSql = (txid, tableModel, afterTable, changedIds) => {
  const columnsForInsert = columnsForSelectClause(tableModel);
  return `INSERT INTO ${tableModel.table}_changes(txid, operation, ${selectList(null, columnsForInsert.map(name))}) 
   (SELECT ${txid}, 'update', ${selectList(null, columnsForInsert.map(name))} FROM ${afterTable} NATURAL JOIN ${changedIds})`;
}


const computeUpdatesSubset = (client, txid, sourceTableOrView, dirtyTable, tableModel, nonPreservedColumns) => go(function* () {
  assert(nonPreservedColumns === undefined);
  const columnsFromSource = tableModel.columns.filter(fromSource);
  const comparedColumns = tableModel.columns.filter(compare);
  const nonPrimaryComparedColumns = comparedColumns.filter(col => !tableModel.primaryKey.includes(name(col)));
  if(nonPrimaryComparedColumns.length === 0) {
    return;
  }
  const idSelect = selectList(null, tableModel.primaryKey);
  const presentBeforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const presentAfterSql = `SELECT ${idSelect} FROM ${sourceTableOrView} NATURAL JOIN ${dirtyTable}`;
  const possiblyChangedIds = `${presentBeforeSql} INTERSECT ${presentAfterSql}`;
  const changedColumnClause = columnsDistinctClause('before', 'after', nonPrimaryComparedColumns);
  const sql =
    `WITH possiblyChanged AS (${possiblyChangedIds}),
     before AS (select ${selectList(tableModel.table, comparedColumns.map(name))} FROM ${tableModel.table} NATURAL JOIN possiblyChanged),
     raw_after AS (select ${selectList(sourceTableOrView, columnsFromSource.map(name))} FROM ${sourceTableOrView} NATURAL JOIN possiblyChanged),
     after AS (SELECT ${makeSelectClause('raw_after', tableModel, comparedColumns)}  FROM raw_after),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}
  FROM before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  WHERE ${changedColumnClause})
   ${insertUpdatesSql(txid, tableModel, 'after', 'changedIds')};
`;
  yield client.query(sql);
});

const computeUpdatesView =
  (client, txid, sourceTableOrView, dstTable, tableModel, nonPreservedColumns) => go(function* () {
    assert(nonPreservedColumns === undefined);

    const comparedColumns = tableModel.columns
      .filter(col => compare(col))
      .filter(column => !tableModel.primaryKey.includes(name(column)));
    const columnsFromSource = tableModel.columns.filter(fromSource);
    const nonPrimaryColumns = tableModel.columns.filter(column => !tableModel.primaryKey.includes(name(column)));
    if(nonPrimaryColumns.length === 0) {
      return;
    }
    const changedColumnClause = columnsDistinctClause('before', 'after', comparedColumns);
    const sql =
      `WITH 
     raw_after AS (select ${columnsFromSource.map(col => name(col)).join(', ')} FROM ${sourceTableOrView}),
     after AS (SELECT ${makeSelectClause('raw_after', tableModel)} FROM raw_after),
     changedIds AS (SELECT ${selectList('before', tableModel.primaryKey)}
  FROM ${dstTable} before JOIN after ON ${columnsEqualClause('before', 'after', tableModel.primaryKey)}
  WHERE ${changedColumnClause})
   ${insertUpdatesSql(txid, tableModel, 'after', 'changedIds')}
`;
    yield client.query(sql);
  });
/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
const computeUpdates = (client, txid, sourceTableOrView, tableModel, nonPreservedColumns) =>
  computeUpdatesView(client, txid, sourceTableOrView, tableModel.table, tableModel, nonPreservedColumns);


const insertDeletesSql = (txid, tableModel, idTable) => {
  const columns = columnsForSelectClause(tableModel);
  const changesColumnList = ['txid', 'operation',columns.map(name)];
  const selectColumns = selectList('t', columns.map(name));
  return `INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) 
            (SELECT ${txid}, 'delete', ${selectColumns} FROM ${tableModel.table} t NATURAL JOIN ${idTable})`
};

const computeDeletesView = (client, txid, srcTable, dstTable, tableModel) => {
  const selectIds = selectList(null, tableModel.primaryKey);
  const sql =
    `WITH ids AS 
    (SELECT ${selectIds} FROM ${dstTable} EXCEPT SELECT ${selectIds} FROM ${srcTable})
    ${insertDeletesSql(txid, tableModel, 'ids')}
      `;
  return client.query(sql);
};


const computeDeletes = (client, txid, srcTable, tableModel) =>
  computeDeletesView(client, txid, srcTable, tableModel.table, tableModel);

const computeDeletesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel) => {
  const idSelect = selectList(null, tableModel.primaryKey);
  const beforeSql = `SELECT ${idSelect} FROM ${tableModel.table} NATURAL JOIN ${dirtyTable}`;
  const afterSql = `SELECT ${idSelect} FROM ${srcTableOrView} NATURAL JOIN ${dirtyTable}`;
  const deleteIdsSql = `WITH before as (${beforeSql}), after AS (${afterSql}) SELECT ${idSelect} from before EXCEPT SELECT ${idSelect} FROM after`;

  const sql = `WITH ids AS (${deleteIdsSql})
      ${insertDeletesSql(txid, tableModel, 'ids')}`;
  return client.query(sql);
};


const computeDifferencesView =
  (client, txid, srcTable, dstTable, tableModel, columns) => go(function* () {
    yield computeInsertsView(client, txid, srcTable, dstTable, tableModel, columns);
    yield computeUpdatesView(client, txid, srcTable, dstTable, tableModel, columns);
    yield computeDeletesView(client, txid, srcTable, dstTable, tableModel);
    for(let col of tableModel.columns) {
      yield preApplyChanges(col, client, txid, tableModel);
    }
    if(!tableModel.noPublic) {
      yield setPublic(client, txid, tableModel);
    }
  });

/**
 * Compute the differences between a "source" table and the table specified by tableModel.
 * The differences is stored in the change table, that is, the table specified by the tableModel suffixed by "_changes".
 * Each column must specify how it participates in the comparison. This is done by implementing the multimethods defined
 * in table-diff-protocol.
 */
const computeDifferences =
  (client, txid, srcTable, tableModel, columns) =>
    computeDifferencesView(client, txid, srcTable, tableModel.table, tableModel, columns);

const computeDifferencesSubset = (client, txid, srcTableOrView, dirtyTable, tableModel, columns) => go(function* () {
  yield computeInsertsSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeUpdatesSubset(client, txid, srcTableOrView, dirtyTable, tableModel, columns);
  yield computeDeletesSubset(client, txid, srcTableOrView, dirtyTable, tableModel);
  for(let col of tableModel.columns) {
    yield preApplyChanges(col, client, txid, tableModel);
  }
  if(!tableModel.noPublic) {
    yield setPublic(client, txid, tableModel);
  }
});

const applyInserts = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  const columnList = selectList(null, allColumnNames(tableModel));
  yield client.query(`INSERT INTO ${tableModel.table}(${columnList}) (SELECT ${columnList} FROM ${changeTable} WHERE txid = ${txid} and operation = 'insert')`);
});

const applyDeletes = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  yield client.query(`DELETE FROM ${tableModel.table} t USING ${changeTable} c WHERE c.txid = ${txid} AND operation='delete' AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
});

const applyUpdates = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  const columnsToUpdate = nonPrimaryColumnNames(tableModel);
  if (columnsToUpdate.length > 0) {
    const updateClause = columnsToUpdate.map(column => `${column} = c.${column}`).join(', ');
    yield client.query(`UPDATE ${tableModel.table} t SET ${updateClause} FROM ${changeTable} c WHERE c.txid = ${txid} AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
  }
});

const applyChanges = (client, txid, tableModel, changeTable) => go(function* () {
  changeTable = changeTable || `${tableModel.table}_changes`;
  yield applyDeletes(client, txid, tableModel, changeTable);
  yield applyUpdates(client, txid, tableModel, changeTable);
  yield applyInserts(client, txid, tableModel, changeTable);
  for(let col of tableModel.columns) {
    yield postApplyChanges(col, client, txid, tableModel);
  }
});

const getChangeTableSql = tableModel => {
  const selectFields = selectList(null, allColumnNames(tableModel));
  const selectKeyClause = selectList(null, tableModel.primaryKey);
  const changeTableName = `${tableModel.table}_changes`;
  return `
  DROP TABLE IF EXISTS ${changeTableName} CASCADE;
  CREATE TABLE ${changeTableName} AS (SELECT NULL::integer as txid, NULL::integer as changeid, NULL::operation_type as operation, null::boolean as public, ${selectFields} FROM ${tableModel.table} WHERE false);
  CREATE INDEX ON ${changeTableName}(${selectKeyClause}, txid desc NULLS LAST, changeid desc NULLS LAST);
  CREATE INDEX ON ${changeTableName}(changeid) WHERE public;
  CREATE INDEX ON ${changeTableName}(txid) ;
  CREATE INDEX ON ${changeTableName}(txid, changeid) WHERE public`
};

const createChangeTable = (client, tableModel) => go(function* () {
  yield client.query(getChangeTableSql(tableModel));
});

const initChangeTable = (client, txid, tableModel) => go(function* () {
  const columnList = selectList(null, allColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  yield client.query(`INSERT INTO ${changeTableName}(txid, operation, ${columnList}) 
  (SELECT ${txid}, 'insert', ${columnList} FROM ${tableModel.table})`);
  yield client.query(`ANALYZE ${changeTableName}`);
  yield deriveColumnsForChange(client, txid, tableModel);
});

const clearHistory = (client, txid, tableModel) => go(function* () {
  const selectFields = selectList(null, allColumnNames(tableModel));
  const changeTableName = `${tableModel.table}_changes`;
  yield client.query(`DELETE FROM ${changeTableName}`);
  const sql = `INSERT INTO ${changeTableName}(txid, operation, public, ${selectFields}) 
  (SELECT ${txid}, 'insert', false, ${selectFields} FROM ${tableModel.table})`;
  yield client.query(sql);
});

const initializeChangeTable = (client, txid, tableModel) => {
  const selectFields = selectList(null, tableModel.columns.map(column => column.name));
  const changeTableName = `${tableModel.table}_changes`;
  return client.query(`INSERT INTO ${changeTableName}(txid, operation, public, ${selectFields}) 
  (SELECT ${txid}, 'insert', false, ${selectFields} FROM ${tableModel.table})`);
};

const initializeFromScratch = (client, txid, sourceTableOrView, tableModel) => go(function* () {
  const selectClause = makeSelectClause('t', tableModel);
  const changesColumnList = ['txid', 'operation', columnsForSelectClause(tableModel).map(name)];
  const insertSql = `INSERT INTO ${tableModel.table}_changes(${changesColumnList.join(', ')}) 
    (SELECT ${txid}, 'insert', ${selectClause} FROM ${sourceTableOrView} t)`;
  yield client.query(insertSql);
  yield client.query(`ANALYZE ${tableModel.table}_changes`);
  for(let col of tableModel.columns) {
    yield preApplyChanges(col, client, txid, tableModel);
  }
  yield applyChanges(client, txid, tableModel);
  yield client.query(`ANALYZE ${tableModel.table}`);
});

/**
 * Assign sequence number to multiple changes in correct order, respecting any foreign key relationships.
 * Tables must be provided in order, such that any table only references tables before it.
 * Assumes that foreign keys are immutable, such that order of updates does not matter.
 * @param client
 * @param txid
 * @param orderedTableModels
 */
const assignSequenceNumbersToDependentTables = (client, txid, orderedTableModels) => go(function*() {
  const reversedTableModels = orderedTableModels.slice().reverse();
  for(let tableModel of reversedTableModels) {
    yield assignSequenceNumbers(client, txid, tableModel, 'delete');
  }
  for(let tableModel of orderedTableModels) {
    yield assignSequenceNumbers(client, txid, tableModel, 'insert');
    yield assignSequenceNumbers(client, txid, tableModel, 'update');
  }
});

const countChanges = (client, txid, tableModel) => go(function*() {
  return   (yield client.queryRows(`select count(*)::integer as c from ${tableModel.table}_changes where txid = $1`, [txid]))[0].c;
});


module.exports = {
  computeInserts,
  computeInsertsSubset,
  computeUpdates,
  computeUpdatesSubset,
  computeDeletes,
  computeDeletesSubset,
  computeDifferencesView,
  computeDifferences,
  computeDifferencesSubset,
  applyInserts,
  applyUpdates,
  applyDeletes,
  applyChanges,
  createChangeTable,
  initChangeTable,
  initializeFromScratch,
  clearHistory,
  getChangeTableSql,
  assignSequenceNumbersToDependentTables,
  initializeChangeTable,
  applyCurrentTableToChangeTable,
  countChanges,
  makeSelectClause,
  createIncrementalDifferences
};
