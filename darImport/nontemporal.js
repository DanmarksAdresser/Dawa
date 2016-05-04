"use strict";

var dbSpecUtil = require('./dbSpecUtil');
var _ = require('underscore');

const tablediff = require('../importUtil/tablediff');

const computeInserts = tablediff.computeInserts;
const computeUpdates = tablediff.computeUpdates;
const computeDeletes = tablediff.computeDeletes;
const applyInserts = tablediff.applyInserts;
const applyUpdates = tablediff.applyUpdates;
const applyDeletes = tablediff.applyDeletes;


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
      return applyInserts(client, 'insert_' + table, table, spec.columns);
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
