"use strict";

var format = require('string-format');

var selectList = require('./sqlUtil').selectList;

exports.createEmptyChangeTables = function(client, table, dbSpecImpl) {
  return client.queryp(format(
    'CREATE TEMP TABLE insert_{table} AS SELECT {select} FROM {table} WHERE false;' +
    ' CREATE TEMP TABLE update_{table} AS SELECT {select} FROM {table} WHERE false;' +
    ' CREATE TEMP TABLE delete_{table} AS SELECT {deleteColumns} FROM {table} WHERE false;',
    {
      table: table,
      select: selectList(undefined, dbSpecImpl.changeTableColumnNames),
      deleteColumns: selectList(undefined, dbSpecImpl.deleteTableColumnNames)
    }), []);
};

exports.createTempTableForCsvContent = function(client, tableName, dbSpecImpl) {
  var columnNames = dbSpecImpl.changeTableColumnNames;
  return client.queryp(format('CREATE TEMP TABLE {tableName} AS SELECT {select} FROM {templateTable} WHERE false',
    {
      tableName: tableName,
      select: selectList(undefined, columnNames),
      templateTable: dbSpecImpl.table
    }), []);
};

exports.applyChanges = function(client, impl, table, options) {
  options = options || {};
  return impl.applyInserts(client, table, options)
    .then(function () {
      return impl.applyUpdates(client, table, options);
    })
    .then(function () {
      if(!options.skipDeletes) {
        return impl.applyDeletes(client, table, options);
      }
    });
};


