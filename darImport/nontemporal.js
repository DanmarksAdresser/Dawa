"use strict";

var dbSpecUtil = require('./dbSpecUtil');
var format = require('string-format');
var _ = require('underscore');

var sqlUtil = require('./sqlUtil');


var columnsDistinctClause = sqlUtil.columnsDistinctClause;
var columnsEqualClause = sqlUtil.columnsEqualClause;
var selectList = sqlUtil.selectList;

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

function applyInserts(client, insTable, dstTable, spec) {
  var select = selectList(insTable, spec.columns);
  var dstColumnList = selectList(undefined, spec.columns);
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

module.exports = function(spec) {
  var allColumns = spec.columns;
  var idColumns = spec.idColumns;
  var impl = {
    temporality: 'nontemporal',
    table: spec.table,
    idColumns: idColumns,
    changeTableColumnNames: allColumns,
    deleteTableColumnNames: idColumns,
    allColumnNames:  allColumns,
    computeDifferences: function (client, srcTable, dstTable, actTable, options) {
      return computeInserts(client, srcTable, actTable, 'insert_' + dstTable, idColumns)
        .then(function () {
          var columnsToCheck;
          if (options && options.columnsToCheck) {
            columnsToCheck = options.columnsToCheck;
          }
          else {
            columnsToCheck = _.difference(allColumns, idColumns);
          }
          return computeUpdates(client, srcTable, actTable, 'update_' + dstTable, idColumns, columnsToCheck);
        })
        .then(function() {
          return computeDeletes(client, srcTable, actTable, 'delete_' + dstTable, idColumns);
        });
    },
    applyInserts: function (client, table) {
      return applyInserts(client, 'insert_' + table, table, spec);
    },
    applyUpdates: function (client, table, options) {
      var columnsToUpdate;
      if (options && options.columnsToUpdate) {
        columnsToUpdate = options.columnsToUpdate;
      }
      else {
        columnsToUpdate = _.difference(allColumns, idColumns);
      }
      return applyUpdates(client, 'update_' + table, table, idColumns, columnsToUpdate);
    },
    applyDeletes: function(client, table) {
      return applyDeletes(client, 'delete_' + table, table, idColumns);
    }
  };
  impl.compareAndUpdate = function(client, srcTable, table, options) {
    options = options || {};
    if(options.columnsToCheck) {
      options.columnsToUpdate = options.columnsToCheck;
    }
    return impl.computeDifferences(client, srcTable, table, table, options).then(function() {
      return dbSpecUtil.applyChanges(client, impl, table, options);
    });
  };
  return impl;
};
