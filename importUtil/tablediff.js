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
  return client.queryp(
    format("CREATE TEMP TABLE {insTable} AS SELECT {srcTable}.*" +
      " FROM {srcTable}" +
      " WHERE NOT EXISTS(SELECT 1 FROM {dstTable} WHERE {idEqualsClause})",
      {
        srcTable: srcTable,
        dstTable: dstTable,
        insTable: insTable,
        idEqualsClause: columnsEqualClause(srcTable, dstTable, idColumns)
      }),
    []);
}

/**
 * Given srcTable and dstTable, insert into a new temporary table upTable the set of rows
 * to be updated in dstTable in order to make srcTable and dstTable equal.
 */
function computeUpdates(client, srcTable, dstTable, upTable, idColumns, columnsToCheck) {
  if(columnsToCheck.length === 0) {
    return Promise.resolve(null);
  }
  return client.queryp(
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
      }),
    []);
}

/**
 * Given srcTable and dstTable, insert into a new, temporary table delTable, the
 * set of rows to be deleted in dstTable in order to make srcTable and dstTable equal.
 * The created table delTable only contains the primary key columns.
 */
function computeDeletes(client, srcTable, dstTable, delTable, idColumns) {
  return client.queryp(
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

function applyInserts(client, insTable, dstTable, columns) {
  var select = selectList(insTable, columns);
  var dstColumnList = selectList(undefined, columns);
  var sql = format("INSERT INTO {dstTable}({dstColumnList}) SELECT {select} FROM {insTable}",
    {
      dstTable: dstTable,
      insTable: insTable,
      select: select,
      dstColumnList: dstColumnList
    });
  return client.queryp(sql, []);
}

function applyUpdates(client, upTable, dstTable, idColumns, columnsToUpdate) {
  if(columnsToUpdate.length === 0) {
    return Promise.resolve(null);
  }
  var fieldUpdates = columnsToUpdate.map(function(column) {
    return format('{column} = {srcTable}.{column}', {
      column: column,
      srcTable: upTable
    });
  }).join(', ');
  var sql = format(
    "UPDATE {dstTable} SET" +
    " {fieldUpdates}" +
    " FROM {upTable}" +
    " WHERE {idColumnsEqual}",
    {
      dstTable: dstTable,
      upTable: upTable,
      fieldUpdates: fieldUpdates,
      idColumnsEqual: columnsEqualClause(upTable, dstTable, idColumns)
    });
  return client.queryp(sql, []);
}

function applyDeletes(client, delTable, dstTable, idColumns) {
  var sql = format("DELETE FROM {dstTable} USING {delTable}" +
    " WHERE {idColumnsEqual}",
    {
      dstTable: dstTable,
      delTable: delTable,
      idColumnsEqual: columnsEqualClause(delTable, dstTable, idColumns)
    });
  return client.queryp(sql, []);
}

function applyChanges(client, changeTableSuffix, targetTable, idColumns, allColumns, columnsToUpdate) {
  return q.async(function*() {
    yield applyInserts(client, `insert_${changeTableSuffix}`, targetTable, allColumns);
    yield applyUpdates(client, `update_${changeTableSuffix}`, targetTable, idColumns, columnsToUpdate);
    yield applyDeletes(client, `delete_${changeTableSuffix}`, targetTable, idColumns);
  })();
}

function computeDifferences(client, srcTable, dstTable, idColumns, columnsToCheck) {
  const insTable = `insert_${dstTable}`;
  const upTable = `update_${dstTable}`;
  const delTable = `delete_${dstTable}`;
  return q.async(function*() {
    yield computeInserts(client, srcTable, dstTable, insTable, idColumns);
    yield computeUpdates(client, srcTable, dstTable, upTable, idColumns, columnsToCheck);
    yield computeDeletes(client, srcTable, dstTable, delTable, idColumns);
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
  countDifferences: countDifferences,
  applyInserts: applyInserts,
  applyUpdates: applyUpdates,
  applyDeletes: applyDeletes,
  applyChanges: applyChanges,
  dropChangeTables: dropChangeTables
};
