"use strict";
var format = require('string-format');
var _ = require('underscore');

var dbSpecUtil = require('./dbSpecUtil');
var logger = require('../logger').forCategory('darImport');
var nontemporal = require('./nontemporal');
var sqlUtil = require('./sqlUtil');

var columnsEqualClause = sqlUtil.columnsEqualClause;

/**
 * This function takes a destination table and a table containing updates to be performed to
 * the destination table, and set the tx_expired column on all columns, which will have
 * registering slut set.
 * @param client
 * @param destinationTable
 * @param upTable
 * @param spec
 * @returns {*}
 */
function markExpiredRecords(client, destinationTable, upTable, spec) {
  return client.queryp(format('UPDATE' +
    ' {destinationTable}' +
    ' SET tx_expired = current_dar_transaction()' +
    ' FROM {upTable}' +
    ' WHERE {idColumnsEqual}' +
    ' AND upper({upTable}.registrering) IS NOT NULL' +
    ' AND upper({destinationTable}.registrering) IS NULL',
    {
      destinationTable: destinationTable,
      upTable: upTable,
      idColumnsEqual: columnsEqualClause(upTable, destinationTable, ['versionid'])
    }), []);
}

function getLastModificationTimestamp(client, table) {
  return client.queryp('SELECT MAX(COALESCE(upper(registrering), lower(registrering))) AS ts FROM ' + table, [])
    .then(function(result) {
      var ts = result.rows[0].ts;
      logger.info('last CSV timestamp in CSV file', {
        lastCsvTimestamp: ts,
        table: table
      });
      return ts;
    });
}

function removeChangesAfterCsv(client, targetTable, lastCsvTimestamp) {
  var upTable = 'update_' + targetTable;
  var delTable = 'delete_' + targetTable;
  return client.queryp(format(
    'DELETE FROM {upTable}' +
    ' USING {targetTable}' +
    ' WHERE {upTable}.versionid = {targetTable}.versionid' +
    ' AND COALESCE(upper({targetTable}.registrering), lower({targetTable}.registrering)) > $1 ',
    {
      upTable: upTable,
      targetTable: targetTable
    }), [lastCsvTimestamp])
    .then(function () {
      return client.queryp(format(
        'DELETE FROM {delTable}' +
          ' USING {targetTable}' +
          ' WHERE {delTable}.versionid = {targetTable}.versionid' +
          ' AND COALESCE(upper({targetTable}.registrering), lower({targetTable}.registrering)) > $1',
        {
          delTable: delTable,
          targetTable: targetTable
        }
      ), [lastCsvTimestamp]);
    });
}


module.exports = function (spec) {
  var allColumns = spec.columns.concat(['versionid', 'registrering', 'virkning', 'dbregistrering']);
  var versionIdColumn = ['versionid'];
  var nonTempSpec = {
    table: spec.table,
    columns: allColumns,
    idColumns: versionIdColumn
  };
  var nonTempImpl = nontemporal(nonTempSpec);
  var impl = {
    temporality: 'bitemporal',
    table: spec.table,
    changeTableColumnNames: allColumns,
    deleteTableColumnNames: versionIdColumn,
    allColumnNames: allColumns,
    computeDifferences: function (client, srcTable, dstTable, actTable, options) {
      var columnsToCheck = ['registrering', 'dbregistrering'];
      if (options && options.useFastComparison === false) {
        columnsToCheck.concat(['virkning']).concat(spec.columns);
      }
      return nonTempImpl.computeDifferences(client, srcTable, dstTable, actTable, {
        columnsToCheck: columnsToCheck
      });
    },
    applyInserts: function (client, table) {
      return nonTempImpl.applyInserts(client, table);
    },
    applyUpdates: function (client, table, options) {
      var columnsToUpdate = ['registrering', 'dbregistrering'];
      if (options && options.updateAllFields) {
        columnsToUpdate = columnsToUpdate.concat(['virkning']).concat(spec.dbColumns);
      }
      return markExpiredRecords(client, table, 'update_' + table, spec)
        .then(function () {
          return nonTempImpl.applyUpdates(client, table, {
            columnsToUpdate: columnsToUpdate
          });
        });
    },
    applyDeletes: function (client, table) {
      return nonTempImpl.applyDeletes(client, table);
    }
  };
  impl.compareAndUpdate = function (client, srcTable, table, options) {
    options = _.defaults({}, options, {
      useFastComparison: false,
      ignoreNewerRecords: true
    });
    if (options.useFastComparison) {
      options.updateAllFields = true;
    }
    return impl.computeDifferences(client, srcTable, table, table, options)
      .then(function () {
        if (options.ignoreNewerRecords) {
          return getLastModificationTimestamp(client, srcTable).then(function (lastCsvTimestamp) {
            return removeChangesAfterCsv(client, table, lastCsvTimestamp);
          });
        }
      })
      .then(function () {
        return dbSpecUtil.applyChanges(client, impl, table, options);
      });
  };
  return impl;
};
