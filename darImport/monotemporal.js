"use strict";

var format = require('string-format');
var _ = require('underscore');

var dbSpecUtil = require('./dbSpecUtil');
var sqlUtil = require('./sqlUtil');

var columnsDistinctClause = sqlUtil.columnsDistinctClause;
var columnsEqualClause = sqlUtil.columnsEqualClause;
var columnsNotDistinctClause = sqlUtil.columnsNotDistinctClause;
var selectList = sqlUtil.selectList;

function keyEqualsClause(alias1, alias2, spec) {
  return columnsEqualClause(alias1, alias2, spec.idColumns);
}


/**
 * Create a SQL clause for whether non-key fields differ between two tables.
 * @param alias1
 * @param alias2
 * @param spec
 * @returns {*}
 */
function nonKeyFieldsDifferClause(alias1, alias2, spec) {
  var columns = _.difference(spec.columns, spec.idColumns);
  return columnsDistinctClause(alias1, alias2, columns);
}

function computeDifferencesMonotemporal(client, srcTable, dstTable, actTable, spec) {
  var columns = spec.columns;

  var currentTableName = 'current_' + dstTable;

  var currentQuery = format('SELECT ' + columns.join(', ') + ' FROM {table} WHERE upper_inf(registrering) ',
    {
      table: actTable
    });

  var rowsToInsert = format(
    'SELECT {desired}.* from {desired} WHERE NOT EXISTS(SELECT * FROM  {current} WHERE {keyEqualsClause})',
    {
      desired: srcTable,
      current: currentTableName,
      keyEqualsClause: keyEqualsClause(srcTable, currentTableName, spec)
    }
  );
  var idColumnsSelect = spec.idColumns.join(', ');
  var rowsToDelete = format(
    'SELECT {idColumns} FROM {current}' +
    ' WHERE NOT EXISTS(SELECT * FROM {desired} WHERE {keyEqualsClause})',
    {
      idColumns: idColumnsSelect,
      desired: srcTable,
      current: currentTableName,
      keyEqualsClause: keyEqualsClause(srcTable, currentTableName, spec)
    });
  var rowsToUpdate = format('SELECT {desired}.* FROM {current} JOIN {desired} ON {keyEqualsClause}' +
    'WHERE {nonKeyFieldsDifferClause}',
    {
      desired: srcTable,
      current: currentTableName,
      keyEqualsClause: keyEqualsClause(srcTable, currentTableName, spec),
      nonKeyFieldsDifferClause: nonKeyFieldsDifferClause(srcTable, currentTableName, spec)
    });

  return client.queryp(format('CREATE TEMP TABLE {current} AS ({currentQuery})',
    {
      current: currentTableName,
      currentQuery: currentQuery
    }), [])
    .then(function () {
      return client.queryp(format('CREATE TEMP TABLE {inserts} AS ({rowsToInsert})',
        {
          inserts: 'insert_' + dstTable,
          rowsToInsert: rowsToInsert
        }), []);
    })
    .then(function () {
      return client.queryp(format('CREATE TEMP TABLE {updates} AS ({rowsToUpdate})',
        {
          updates: 'update_' + dstTable,
          rowsToUpdate: rowsToUpdate
        }, []));
    })
    .then(function () {
      return client.queryp(format('CREATE TEMP TABLE {deletes} AS ({rowsToDelete})',
        {
          deletes: 'delete_' + dstTable,
          rowsToDelete: rowsToDelete
        }));
    });
}

function doInserts(client, srcTable, table, columns) {
  var select = selectList(srcTable, columns);
  var dstColumnList = selectList(undefined, columns);
  var sql = format("INSERT INTO {dstTable}({dstColumnList}) SELECT {select} FROM {srcTable}",
    {
      dstTable: table,
      srcTable: srcTable,
      select: select,
      dstColumnList: dstColumnList
    });
  return client.queryp(sql, []);
}

function expireOldRows(client, srcTable, table, idColumns) {
  var expireOldRowsSql = format(
    "UPDATE {table}" +
    " SET registrering = tstzrange(lower(registrering), CURRENT_TIMESTAMP, '[)')" +
    " FROM {srcTable}" +
    " WHERE {idColumnsEqual}" +
    " AND upper_inf(registrering)",
    {
      table: table,
      sourceTable: srcTable,
      idColumnsEqual: columnsNotDistinctClause(srcTable, table, idColumns)
    });
  return client.queryp(expireOldRowsSql, []);
}

module.exports = function (spec) {
  var impl = {
    temporality: 'monotemporal',
    table: spec.table,
    changeTableColumnNames: spec.columns,
    deleteTableColumnNames: spec.idColumns,
    allColumnNames: spec.columns.concat(['versionid', 'registrering']),
    computeDifferences: function (client, srcTable, dstTable, actTable) {
      return computeDifferencesMonotemporal(client, srcTable, dstTable, actTable, spec);
    },
    applyInserts: function(client, table) {
      var insTable = 'insert_' + table;
      return doInserts(client, insTable, table, spec.columns);
    },
    applyUpdates: function(client, table) {
      return expireOldRows(client, 'update_' + table, table, spec.idColumns)
        .then(function() {
          return doInserts(client, 'update_' + table, table, spec.columns);
        });
    },
    applyDeletes: function(client, table) {
      return expireOldRows(client, 'delete_' + table, table, spec.idColumns);
    }
  };
  impl.compareAndUpdate = function(client, srcTable, table) {
    return impl.computeDifferences(client, srcTable, table, table).then(function() {
      return dbSpecUtil.applyChanges(client, impl, table);
    });
  };
  return impl;
};
