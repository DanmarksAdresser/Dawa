"use strict";

const format = require('string-format');
const q = require('q');

const sqlUtil = require('../darImport/sqlUtil');

const columnsDistinctClause = sqlUtil.columnsDistinctClause;
const columnsEqualClause = sqlUtil.columnsEqualClause;
const importUtil = require('./importUtil');
const selectList = sqlUtil.selectList;

/**
 * Given srcTable and dstTable, insert into a new, temporary table instTable the set of rows
 * to be inserted into dstTable in order to make srcTable and dstTable equal.
 */
function computeInserts(client, srcTable, dstTable, insTable, idColumns) {
  return client.queryBatched(
    format("CREATE TEMP TABLE {insTable} AS SELECT {srcTable}.*" +
      " FROM {srcTable}" +
      " WHERE NOT EXISTS(SELECT 1 FROM {dstTable} WHERE {idEqualsClause})",
      {
        srcTable: srcTable,
        dstTable: dstTable,
        insTable: insTable,
        idEqualsClause: columnsEqualClause(srcTable, dstTable, idColumns)
      }));
}

/**
 * Given srcTable and dstTable, insert into a new temporary table upTable the set of rows
 * to be updated in dstTable in order to make srcTable and dstTable equal.
 */
function computeUpdates(client, srcTable, dstTable, upTable, idColumns, columnsToCheck) {
  if(columnsToCheck.length === 0) {
    return q.resolve(null);
  }
  return client.queryBatched(
    format("CREATE TEMP TABLE {upTable} AS SELECT {srcTable}.*" +
      " FROM {srcTable}" +
      " JOIN {dstTable} ON {idEqualsClause}" +
      " WHERE {nonIdColumnsDifferClause}",
      {
        srcTable: srcTable,
        dstTable: dstTable,
        upTable: upTable,
        idEqualsClause: columnsEqualClause(srcTable, dstTable, idColumns),
        nonIdColumnsDifferClause: columnsDistinctClause(srcTable, dstTable, columnsToCheck)
      }));
}

/**
 * Given srcTable and dstTable, insert into a new, temporary table delTable, the
 * set of rows to be deleted in dstTable in order to make srcTable and dstTable equal.
 * The created table delTable only contains the primary key columns.
 */
function computeDeletes(client, srcTable, dstTable, delTable, idColumns) {
  return client.queryBatched(
    format("CREATE TEMP TABLE {delTable} AS SELECT {selectIdColumns} FROM {dstTable}" +
      " WHERE NOT EXISTS(SELECT * FROM {srcTable} WHERE {idEqualsClause})",
      {
        srcTable: srcTable,
        dstTable: dstTable,
        delTable: delTable,
        selectIdColumns: selectList(dstTable, idColumns),
        idEqualsClause: columnsEqualClause(srcTable, dstTable, idColumns)
      }),
    []);
}

function applyInserts(client, insTable, dstTable, columns, ignoreConflicting) {
  var select = selectList(insTable, columns);
  var dstColumnList = selectList(undefined, columns);
  let sql = `INSERT INTO ${dstTable}(${dstColumnList}) (SELECT ${select} FROM ${insTable})`;
  if(ignoreConflicting) {
    sql += 'ON CONFLICT DO NOTHING';
  }
  return client.queryBatched(sql);
}

function applyUpdates(client, upTable, dstTable, idColumns, columnsToUpdate) {
  if(columnsToUpdate.length === 0) {
    return q.resolve(null);
  }
  var fieldUpdates = columnsToUpdate.map(function(column) {
    return format('{column} = {srcTable}.{column}', {
      column: column,
      srcTable: upTable
    });
  }).join(', ');
  const sql = `UPDATE ${dstTable} SET ${fieldUpdates} FROM ${upTable} 
  WHERE ${columnsEqualClause(upTable, dstTable, idColumns)}`;
  return client.queryBatched(sql);
}

function applyDeletes(client, delTable, dstTable, idColumns) {
  var sql = format("DELETE FROM {dstTable} USING {delTable}" +
    " WHERE {idColumnsEqual}",
    {
      dstTable: dstTable,
      delTable: delTable,
      idColumnsEqual: columnsEqualClause(delTable, dstTable, idColumns)
    });
  return client.queryBatched(sql);
}

function applyChanges(client, changeTableSuffix, targetTable, idColumns, allColumns, columnsToUpdate, ignoreConflicting) {
  return q.async(function*() {
    yield applyDeletes(client, `delete_${changeTableSuffix}`, targetTable, idColumns);
    yield applyUpdates(client, `update_${changeTableSuffix}`, targetTable, idColumns, columnsToUpdate);
    yield applyInserts(client, `insert_${changeTableSuffix}`, targetTable, allColumns, ignoreConflicting);
  })();
}

function computeDifferences(client, srcTable, dstTable, idColumns, columnsToCheck) {
  return computeDifferencesTargeted(client, srcTable, dstTable, dstTable, idColumns, columnsToCheck);
}

function computeDifferencesSubset(client, dirtyTable, desiredView, targetTable, idColumns, columnsToCheck) {
  return q.async(function*() {
    const desiredTable = `desired_${targetTable}`;
    const actualTable = `actual_${targetTable}`;
    yield client.queryBatched(`CREATE TEMP TABLE ${desiredTable} AS (SELECT ${desiredView}.* FROM ${desiredView} NATURAL JOIN ${dirtyTable})`);
    yield client.queryBatched(`CREATE TEMP TABLE ${actualTable} AS (SELECT ${targetTable}.* FROM ${targetTable} NATURAL JOIN ${dirtyTable})`);
    yield computeDifferencesTargeted(client, desiredTable, actualTable, targetTable, idColumns, columnsToCheck);
    yield client.queryBatched(`DROP TABLE ${desiredTable}; DROP TABLE ${actualTable}`);
  })();
}

function computeDifferencesTargeted(client, desiredTable, actualTable, targetTable, idColumns, columnsToCheck) {
  const insTable = `insert_${targetTable}`;
  const upTable = `update_${targetTable}`;
  const delTable = `delete_${targetTable}`;
  return q.async(function*() {
    yield computeInserts(client, desiredTable, actualTable, insTable, idColumns);
    yield computeUpdates(client, desiredTable, actualTable, upTable, idColumns, columnsToCheck);
    yield computeDeletes(client, desiredTable, actualTable, delTable, idColumns);
  })();
}

function countDifferences(client, table) {
  return client.queryp(`select 
  (select count(*) from insert_${table}) + 
  (select count(*) from update_${table}) + 
  (select count(*) from delete_${table}) as c`)
    .then(result => result.rows[0].c);
}

function dropChangeTables(client, tableSuffix) {
  return q.async(function*() {
    for(let prefix of ['insert_', 'update_', 'delete_']) {
      yield importUtil.dropTable(client, prefix + tableSuffix);
    }
  })();
}


module.exports = {
  computeInserts: computeInserts,
  computeUpdates: computeUpdates,
  computeDeletes: computeDeletes,
  computeDifferences: computeDifferences,
  computeDifferencesTargeted: computeDifferencesTargeted,
  computeDifferencesSubset: computeDifferencesSubset,
  countDifferences: countDifferences,
  applyInserts: applyInserts,
  applyUpdates: applyUpdates,
  applyDeletes: applyDeletes,
  applyChanges: applyChanges,
  dropChangeTables: dropChangeTables
};
