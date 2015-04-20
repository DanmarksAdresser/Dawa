"use strict";

var copyFrom = require('pg-copy-streams').from;
var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var format = require('string-format');
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

var databaseTypes = require('../psql/databaseTypes');
var datamodels = require('../crud/datamodel');
var darSpec = require('./darSpec');
var loadAdresseDataImpl = require('../psql/load-adresse-data-impl');
var promisingStreamCombiner = require('../promisingStreamCombiner');
var sqlCommon = require('../psql/common');
var tema = require('../temaer/tema');
var temaer = require('../apiSpecification/temaer/temaer');
var qUtil = require('../q-util');

var Range = databaseTypes.Range;

var DAWA_TABLES = ['enhedsadresser', 'adgangsadresser', 'vejstykker'];

var DAWA_COLUMNS_TO_CHECK = {
  vejstykke: datamodels.vejstykke.columns,
  adgangsadresse: _.without(datamodels.adgangsadresse.columns, 'ejerlavkode', 'matrikelnr', 'esrejendomsnr'),
  adresse: datamodels.adresse.columns
};

function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

function loadCsvFile(client, filePath, tableName, spec) {
  var columnNames = darSpec.changeTableColumnNames(spec);
  var pgStream = createCopyStream(client, tableName, columnNames);

  var csvParseOptions = {
    delimiter: ';',
    quote: '"',
    escape: '"',
    columns: true
  };

  var inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
  return promisingStreamCombiner([
    inputStream,
    csvParse(csvParseOptions),
    es.mapSync(function(csvRow) {
      return darSpec.transformCsv(spec, csvRow);
    }),
    es.mapSync(function (entity) {
      return darSpec.transform(spec, entity);
    }),
    csvStringify({
      delimiter: ';',
      quote: '"',
      escape: '\\',
      columns: columnNames,
      header: true,
      encoding: 'utf8'
    }),
    pgStream
  ]);
}

function selectList(alias, columns) {
  if(!alias) {
    return columns.join(', ');
  }
  return columns.map(function(column) {
    return alias + '.' + column;
  }).join(', ');
}

function columnsDifferClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} IS DISTINCT FROM {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' OR ') + ')';
}

function columnsEqualClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} = {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' AND ') + ')';
}

function columnsNotDistinctClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} IS NOT DISTINCT FROM {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' AND ') + ')';
}

function keyEqualsClause(alias1, alias2, spec) {
  return columnsNotDistinctClause(alias1, alias2, spec.idColumns);
}


/**
 * Create a SQL clause for whether non-key fields differ between two tables.
 * @param alias1
 * @param alias2
 * @param spec
 * @returns {*}
 */
function nonKeyFieldsDifferClause(alias1, alias2, spec) {
  var columns = _.difference(spec.dbColumns, spec.idColumns);
  return columnsDifferClause(alias1, alias2, columns);
}

function computeDifferencesNonTemporal(client, table, desiredTable, targetTableSuffix, idColumns, columnsToCheck) {
  return computeInserts(client, desiredTable, table, 'insert_' + targetTableSuffix, idColumns)
    .then(function() {
      return computeUpdates(client, desiredTable, table, 'update_' + targetTableSuffix, idColumns, columnsToCheck);
    })
    .then(function() {
      return computeDeletes(client, desiredTable, table, 'delete_' + targetTableSuffix, idColumns);
    });
}

function createEmptyChangeTables(client, table, targetTableSuffix, spec) {
  var changeColumnNames = darSpec.changeTableColumnNames(spec);
  var deleteColumnNames = darSpec.deleteTableColumnNames(spec);
  return client.queryp(format(
    'CREATE TEMP TABLE insert_{suffix} AS SELECT {select} FROM {table} WHERE false;' +
    ' CREATE TEMP TABLE update_{suffix} AS SELECT {select} FROM {table} WHERE false;' +
    ' CREATE TEMP TABLE delete_{suffix} AS SELECT {deleteColumns} FROM {table} WHERE false;',
    {
      suffix: targetTableSuffix,
      table: table,
      select: selectList(undefined, changeColumnNames),
      deleteColumns: selectList(undefined, deleteColumnNames)
    }), []);
}

/**
 * Compute differences between two DAR tables. Will create three temp tables with
 * inserts, updates, and deletes to be performed.
 * @param client
 * @param table
 * @param desiredTable
 * @param targetTableSuffix
 * @param spec
 * @param useFastComparison
 * @returns {*}
 */
function computeDifferences(client, table, desiredTable, targetTableSuffix, spec, useFastComparison) {
  function computeDifferencesMonotemporal() {
    var columns = spec.dbColumns;

    var currentTableName = 'current_' + table;

    var currentQuery = format('SELECT ' + columns.join(', ') + ' FROM {table} WHERE upper_inf(registrering) ',
      {
        table: table
      });

    var rowsToInsert = format(
      'SELECT {desired}.* from {desired} WHERE NOT EXISTS(SELECT * FROM  {current} WHERE {keyEqualsClause})',
      {
        desired: desiredTable,
        current: currentTableName,
        keyEqualsClause: keyEqualsClause(desiredTable, currentTableName, spec)
      }
    );
    var idColumnsSelect = spec.idColumns.join(', ');
    var rowsToDelete = format(
      'SELECT {idColumns} FROM {current}' +
      ' WHERE NOT EXISTS(SELECT * FROM {desired} WHERE {keyEqualsClause})',
      {
        idColumns: idColumnsSelect,
        desired: desiredTable,
        current: currentTableName,
        keyEqualsClause: keyEqualsClause(desiredTable, currentTableName, spec)
      });
    var rowsToUpdate = format('SELECT {desired}.* FROM {current} JOIN {desired} ON {keyEqualsClause}' +
      'WHERE {nonKeyFieldsDifferClause}',
      {
        desired: desiredTable,
        current: currentTableName,
        keyEqualsClause: keyEqualsClause(desiredTable, currentTableName, spec),
        nonKeyFieldsDifferClause: nonKeyFieldsDifferClause(desiredTable, currentTableName, spec)
      });

    return client.queryp(format('CREATE TEMP TABLE {current} AS ({currentQuery})',
      {
        current: currentTableName,
        currentQuery: currentQuery
      }), [])
      .then(function () {
        return client.queryp(format('CREATE TEMP TABLE {inserts} AS ({rowsToInsert})',
          {
            inserts: 'insert_' + targetTableSuffix,
            rowsToInsert: rowsToInsert
          }), []);
      })
      .then(function () {
        return client.queryp(format('CREATE TEMP TABLE {updates} AS ({rowsToUpdate})',
          {
            updates: 'update_' + targetTableSuffix,
            rowsToUpdate: rowsToUpdate
          }, []));
      })
      .then(function () {
        return client.queryp(format('CREATE TEMP TABLE {deletes} AS ({rowsToDelete})',
          {
            deletes: 'delete_' + targetTableSuffix,
            rowsToDelete: rowsToDelete
          }));
      });
  }

  /**
   * Takes to bitemporal tables as input. Compute sets of records to insert, update or delete
   * in order for table to have the same content as desiredTable. These are inserted into
   * insert_<targetTableSuffix>, update_<targetTableSuffix> and delete_<targetTableSuffix> tables.
   *
   * The method assumes that rows are unmodified except for the registrering time.
   */
  function computeDifferencesBitemporal() {
    /**
     * Takes to bitemporal tables as input. Compute sets of records to insert
     * in order for table to have the same content as desiredTable. These are stored in
     * targetTable
     */
    function computeInsertsBitemp(client, table, desiredTable, targetTable) {
      return computeInserts(client, desiredTable, table, targetTable, ['versionid']);
    }

    function computeUpdatesBitemp(client, table, desiredTable, targetTable) {
      var columnsToCheck = ['registrering'];
      if(!useFastComparison) {
        columnsToCheck.concat(['virkning']).concat(spec.dbColumns);
      }
      return computeUpdates(client, desiredTable, table, targetTable, ['versionid'], columnsToCheck);
    }

    function computeDeletesBitemp(client, table, desiredTable, targetTable) {
      return computeDeletes(client, desiredTable, table, targetTable, ['versionid']);
    }

    return computeInsertsBitemp(client, table, desiredTable, 'insert_' + targetTableSuffix)
      .then(function () {
        return computeUpdatesBitemp(client, table, desiredTable, 'update_' + targetTableSuffix);
      })
      .then(function () {
        return computeDeletesBitemp(client, table, desiredTable, 'delete_' + targetTableSuffix);
      });
  }

  if(!spec.bitemporal) {
    return computeDifferencesMonotemporal();
  }
  else {
    return computeDifferencesBitemporal();
  }
}

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
        nonIdColumnsDifferClause: columnsDifferClause(srcTable, dstTable, columnsToCheck)
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

function applyUpdates2(client, upTable, dstTable, idColumns, columnsToUpdate) {
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
      idColumnsEqual: columnsNotDistinctClause(upTable, dstTable, idColumns)
    });
  return client.queryp(sql, []);
}

function applyDeletes2(client, delTable, dstTable, idColumns) {
  var sql = format("DELETE FROM {dstTable} USING {delTable}" +
    " WHERE {idColumnsEqual}",
    {
      dstTable: dstTable,
      delTable: delTable,
      idColumnsEqual: columnsEqualClause(delTable, dstTable, idColumns)
    });
  return client.queryp(sql, []);
}

function createTempTableForCsvContent(client, tableName, spec) {
  var columnNames = darSpec.changeTableColumnNames(spec);
  return client.queryp(format('CREATE TEMP TABLE {tableName} AS SELECT {select} FROM {templateTable} WHERE false',
    {
      tableName: tableName,
      select: selectList(undefined, columnNames),
      templateTable: spec.table
    }), []);
}

function createTableAndLoadData(client, filePath, targetTable, spec) {
  return createTempTableForCsvContent(client, targetTable, spec)
    .then(function() {
      return loadCsvFile(client, filePath, targetTable, spec);
    });
}

function applyInserts(client, destinationTable, sourceTable, spec) {
  var columnNames = darSpec.changeTableColumnNames(spec);
  var select = selectList(sourceTable, columnNames);
  var dstColumnList = selectList(undefined, columnNames);
  var sql = format("INSERT INTO {destinationTable}({dstColumnList}) SELECT {select} FROM {sourceTable}",
    {
      destinationTable: destinationTable,
      sourceTable: sourceTable,
      select: select,
      dstColumnList: dstColumnList
    });
  return client.queryp(sql, []);
}

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
      idColumnsEqual: columnsNotDistinctClause(upTable, destinationTable, spec.idColumns)
    }), []);
}

function applyUpdates(client, destinationTable, sourceTable, spec, updateAllFields) {
  if(spec.bitemporal) {
    var columnsToUpdate = ['registrering'];
    if(updateAllFields) {
      columnsToUpdate = columnsToUpdate.concat(['virkning']).concat(spec.dbColumns);
    }
    return markExpiredRecords(client, destinationTable, sourceTable, spec)
      .then(function() {
        return applyUpdates2(client, sourceTable, destinationTable,['versionid'], columnsToUpdate);
    });
  }
  else {
    var expireOldRowsSql = format(
      "UPDATE {destinationTable}" +
      " SET registrering = tstzrange(lower(registrering), CURRENT_TIMESTAMP, '[)')" +
      " FROM {sourceTable}" +
      " WHERE {idColumnsEqual}",
      {
        destinationTable: destinationTable,
        sourceTable: sourceTable,
        idColumnsEqual: columnsNotDistinctClause(sourceTable, destinationTable, spec.idColumns)
      });
    return client.queryp(expireOldRowsSql, [])
      .then(function() {
        var insertNewRowsSql = format("INSERT INTO {destinationTable}({dstColumnList})" +
          " (SELECT {srcColumnList} FROM {sourceTable})",
          {
            destinationTable: destinationTable,
            sourceTable: sourceTable,
            dstColumnList: selectList(undefined, spec.dbColumns),
            srcColumnList: selectList(sourceTable, spec.dbColumns)
          });
        return client.queryp(insertNewRowsSql, []);
      });

  }
}

function applyDeletes(client, destinationTable, sourceTable, spec) {
  if(spec.bitemporal) {
    return applyDeletes2(client, sourceTable, destinationTable, ['versionid']);
  }
  else {
    var sql = format("UPDATE {destinationTable}" +
    " SET registrering = tstzrange(lower(registrering), CURRENT_TIMESTAMP, '[)')" +
    " FROM {sourceTable}" +
    " WHERE {idColumnsEqual}",
      {
        destinationTable: destinationTable,
        sourceTable: sourceTable,
        idColumnsEqual: columnsNotDistinctClause(destinationTable, sourceTable, spec.idColumns)
      });
    return client.queryp(sql, []);
  }
}

/*
 * For a bitemporal table, remove any changes in upTable which is dated later than
 * the csv file.
 */
function removeChangesAfterCsv(client, targetTable, upTable, lastCsvTimestamp) {
  return client.queryp(format(
  'DELETE FROM {upTable}' +
  ' USING {targetTable}' +
  ' WHERE {upTable}.versionid = {targetTable}.versionid' +
  ' AND COALESCE(upper({targetTable}.registrering), lower({targetTable}.registrering)) > $1 ',
    {
      upTable: upTable,
      targetTable: targetTable
    }), [lastCsvTimestamp]);
}

function applyChanges(client, targetTable, changeTablesSuffix, csvSpec, updateAllFields, lastCsvTimestamp) {
  return q()
    .then(function() {
      if(csvSpec.bitemporal && lastCsvTimestamp) {
        console.log('filtering changes dated after CSV file');
        return removeChangesAfterCsv(client, targetTable, 'update_' + changeTablesSuffix, lastCsvTimestamp)
          .then(function() {
            return removeChangesAfterCsv(client, targetTable, 'delete_' + changeTablesSuffix, lastCsvTimestamp);
          });
      }
    })
    .then(function () {
      return applyInserts(client, targetTable, 'insert_' + changeTablesSuffix, csvSpec);
    })
    .then(function () {
      return applyUpdates(client, targetTable, 'update_' + changeTablesSuffix, csvSpec, updateAllFields);
    }).then(function () {
      return applyDeletes(client, targetTable, 'delete_' + changeTablesSuffix, csvSpec);
    });
}

function applyChangesNonTemporal(client, targetTable, changeTablesSuffix, idColumns, columnsToUpdate) {
  function applyInserts() {
    var sql = format("INSERT INTO {targetTable}" +
      " (SELECT * FROM {sourceTable})",
      {
        targetTable: targetTable,
        sourceTable: 'insert_' + changeTablesSuffix
      });
    return client.queryp(sql, []);
  }
  function applyUpdates() {
    return applyUpdates2(client, 'update_' + changeTablesSuffix, targetTable, idColumns, columnsToUpdate);
  }
  function applyDeletes() {
    return applyDeletes2(client, 'delete_' + changeTablesSuffix, targetTable, idColumns);
  }
  return applyInserts().then(applyUpdates).then(applyDeletes);
}

function dropTable(client, tableName) {
  return client.queryp('DROP TABLE ' + tableName,[]);
}

function dropModificationTables(client, tableSuffix) {
  return dropTable(client, 'insert_' + tableSuffix)
    .then(function() {
      return dropTable(client, 'update_' + tableSuffix);
    })
    .then(function() {
      return dropTable(client, 'delete_' + tableSuffix);
    });
}

function dropChangeTables(client, tableSuffix) {
  return dropModificationTables(client, tableSuffix)
    .then(function() {
      return dropTable(client, 'desired_' + tableSuffix);
    });
}

/**
 * Given a table desiredTable initialized from a CSV file, apply all necessary changes to destinationTable.
 * Any records in destinationTable where registrering is later than the oldest record in CSV file is not modifiedl.
 * @param client
 * @param desiredTable
 * @param destinationTable
 * @param csvSpec
 * @param useFastComparison
 * @returns {*}
 */
function computeAndApplyCsvChanges(client, desiredTable, csvSpec, useFastComparison) {
  var lastCsvTimestamp = null;
  return q()
    .then(function() {
      if(csvSpec.bitemporal) {
        return client.queryp('SELECT MAX(COALESCE(upper(registrering), lower(registrering))) AS ts FROM ' + desiredTable, [])
          .then(function(result) {
            lastCsvTimestamp = result.rows[0].ts;
            console.log('lastCsvTimestamp: ' + lastCsvTimestamp);
          });
      }
    })
    .then(function() {
      console.log('computing differences');
      return computeDifferences(client, csvSpec.table, desiredTable, csvSpec.table, csvSpec, useFastComparison);
    })
    .then(function() {
      console.log('applying changes');
      return applyChanges(client, csvSpec.table, csvSpec.table, csvSpec, !useFastComparison, lastCsvTimestamp);
    });

}
/**
 * Update a table to have same contents as a CSV file. During this process,
 * temp tables with inserts, updates and deletes are produced. These are not dropped.
 * @param client postgres client
 * @param csvFilePath path to the CSV file with authoritative content of the table
 * @param destinationTable the table to be updated to contain the same as the CSV file
 * @param csvSpec
 * @param useFastComparison For bitemporal tables, skip comparison of each field.
 * @returns {*}
 */
function updateTableFromCsv(client, csvFilePath, csvSpec, useFastComparison) {
  var desiredTable = 'desired_' + csvSpec.table;
  return createTableAndLoadData(client, csvFilePath, desiredTable, csvSpec)
    .then(function() {
      return computeAndApplyCsvChanges(client, desiredTable, csvSpec, useFastComparison);
    });
}

function executeExternalSqlScript(client, scriptFile) {
  return q.nfcall(fs.readFile, path.join(__dirname, 'scripts', scriptFile), {encoding: 'utf-8'}).then(function(sql) {
    return client.queryp(sql);
  });
}

/**
 * Given
 */
function computeDirtyObjects(client, report) {
  var tables = ['vejstykker', 'adgangsadresser', 'enhedsadresser'];
  var dirtyComputations = {
    vejstykker: function () {
      return executeExternalSqlScript(client, 'dirty_vejstykker.sql');
    },
    adgangsadresser: function () {
      return executeExternalSqlScript(client, 'dirty_adgangsadresser.sql');
    },
    enhedsadresser: function (){
      return executeExternalSqlScript(client, 'dirty_enhedsadresser.sql');
    }
  };
  return qUtil.mapSerial(tables, function(tableName) {
    return dirtyComputations[tableName]().then(function() {
      return reportTable(client, report, 'dirty_' + tableName);
    });

  });
}

function performDawaChanges(client) {
  return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
    console.log('Updating DAWA entity ' + entityName);
    var idColumns = datamodels[entityName].key;
    var tableName = datamodels[entityName].table;
    return client.queryp(format('CREATE TEMP VIEW desired_{tableName} AS (' +
    'SELECT dar_{tableName}_view.* FROM dirty_{tableName}' +
    ' JOIN dar_{tableName}_view ON {idColumnsEqual})',
      {
        tableName: tableName,
        idColumnsEqual: columnsEqualClause('dar_' + tableName + '_view', 'dirty_' + tableName, idColumns)
      }), [])
      .then(function() {
        return client.queryp(format('CREATE TEMP VIEW actual_{tableName} AS (' +
          'SELECT {tableName}.* FROM dirty_{tableName}' +
          ' JOIN {tableName} ON {idColumnsEqual})',
          {
            tableName: tableName,
            idColumnsEqual: columnsEqualClause('dirty_' + tableName, tableName, idColumns)
          }), []);
      })
      .then(function() {
        return computeDifferencesNonTemporal(
          client,
          'actual_' + tableName,
          'desired_' + tableName,
          tableName,
          idColumns,
          DAWA_COLUMNS_TO_CHECK[entityName]);
      })
      .then(function() {
        return applyChangesNonTemporal(client, tableName, tableName, idColumns, DAWA_COLUMNS_TO_CHECK[entityName]);
      })
      .then(function() {
        return client.queryp('DROP VIEW actual_' + tableName + '; DROP VIEW desired_' + tableName, []);
      })
      .then(function() {
        return dropModificationTables(client, tableName);
      });
  });
}

/**
 * Remove all data from DAR tables
 */
function clearDarTables(client) {
  return qUtil.mapSerial(darSpec.spec, function(spec) {
    return client.queryp('DELETE FROM ' + spec.table, []);
  });
}

/**
 * Initialize DAR tables from CSV, assuming they are empty.
 * Loads data directly into the tables from CSV.
 */
function initDarTables(client, dataDir) {
  return qUtil.mapSerial(darSpec.spec, function(spec, entityName) {
    console.log('Importing ' + entityName);
    return loadCsvFile(client, path.join(dataDir, spec.filename), spec.table, spec);
  });
}

/**
 * Remove all data from adgangsadresser, enhedsadresser, vejstykker and
 * adgangsadresser_temaer_matview, including history.
 */
function clearDawaTables(client) {
  console.log('clearing DAWA tables');
  return sqlCommon.withoutTriggers(client, function() {
    return qUtil.mapSerial(DAWA_TABLES.concat(['adgangsadresser_temaer_matview']), function(tableName) {
      return client.queryp('delete from ' + tableName + '_history', []).then(function() {
        return client.queryp('delete from ' + tableName, []);
      });
    });
  });
}

/**
 * Given that DAR tables are populated, initialize DAWA tables, assuming no
 * existing data is present in the tables.
 */
function initDawaFromScratch(client) {
  console.log('initializing DAWA from scratch');
  return sqlCommon.withoutTriggers(client, function() {
    return qUtil.mapSerial(DAWA_TABLES, function (tableName) {
      var matTable = 'mat_' + tableName;
      var darView = 'dar_' + tableName + '_view';
      console.log('materializing ' + tableName);
      return client.queryp('CREATE TEMP TABLE ' + matTable + ' AS SELECT * FROM ' + darView, [])
        .then(function() {
          console.log('initializing table ' + tableName);
          var sql = format("INSERT INTO {table} (SELECT * FROM mat_{table})",
            {
              table: tableName
            });
          return client.queryp(sql, []);
        })
        .then(function() {
          return client.queryp('DROP TABLE ' + matTable);
        });
    })
      .then(function () {
        console.log('initializing history');
        return loadAdresseDataImpl.initializeHistory(client);
      })
      .then(function() {
        console.log('initializing adresserTemaerView');
        return qUtil.mapSerial(temaer, function(temaSpec) {
          return tema.updateAdresserTemaerView(client, temaSpec, true);
        });
      });
  });
}

/**
 * Delete all data in DAR tables, and repopulate from CSV.
 * If clearDawa is specified, remove all data from DAWA address tables as well
 * (adgangsadresser, enhedsadresser, vejstykker, adgangsadresser_temaer_matview).
 * When DAR tables has been updated, the DAWA tables will be updated as well (
 * from scratch, if clearDawa is specified, otherwise incrementally).
 */
function initFromDar(client, dataDir, clearDawa) {
  return clearDarTables(client)
    .then(function() {
      return initDarTables(client, dataDir);
    })
    .then(function() {
      if(clearDawa) {
        return clearDawaTables(client).then(function() {
          return initDawaFromScratch(client);
        });
      }
      else {
        return fullCompareAndUpdate(client);
      }
    });
}

/**
 * Make a full comparison of DAWA state and DAR state, and perform the necessary updates to
 * the DAWA model
 * @param client
 */
function fullCompareAndUpdate(client) {
  console.log('Performing full comparison and update');
  return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
    var datamodel = datamodels[entityName];
    var dawaTable = datamodel.table;
    return computeDifferencesNonTemporal(client, dawaTable, 'dar_' + dawaTable + '_view',
      dawaTable, datamodel.key, DAWA_COLUMNS_TO_CHECK[entityName])
      .then(function() {
        return applyChangesNonTemporal(client, dawaTable, dawaTable, datamodel.key, DAWA_COLUMNS_TO_CHECK[entityName]);
      })
      .then(function() {
        return dropModificationTables(client, dawaTable);
      });
  });
}

/**
 * Assuming DAR tables are already populated, update DAR tables
 * from CSV, followed by an update of DAWA tables.
 */
function updateFromDar(client, dataDir, fullCompare) {
  return qUtil.mapSerial(darSpec.spec, function(spec, entityName) {
    console.log('Importing ' + entityName);
    return updateTableFromCsv(client, path.join(dataDir, spec.filename), spec, false);
  })
    .then(function() {
      if(fullCompare) {
        return fullCompareAndUpdate(client);
      }
      else {
        console.log('computing dirty objects');
        return computeDirtyObjects(client)
          .then(function() {
            return performDawaChanges(client);
          });
      }

    })
    .then(function() {
      return qUtil.mapSerial(darSpec.spec, function(spec) {
        return dropChangeTables(client, spec.table);
      });
    });
}

/**
 * Store DAR entities fetched from API in temp tables
 * @param client
 * @param rowsMap
 * @returns {*}
 */
function storeFetched(client, rowsMap, report) {
  return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'], function(entityName) {
    var spec = darSpec.spec[entityName];
    var columnNames = darSpec.changeTableColumnNames(spec);
    var fetchedTable = 'fetched_' + entityName;
    return client.queryp('CREATE TEMP TABLE ' + fetchedTable + ' AS select ' + columnNames.join(', ') + ' FROM ' + spec.table + ' WHERE false', [])
      .then(function() {
        var pgStream = createCopyStream(client, fetchedTable, columnNames);
        var inputStream = es.readArray(rowsMap[entityName]);
        return promisingStreamCombiner([
          inputStream,
          es.mapSync(function (csvRow) {
            return darSpec.transform(spec, csvRow);
          }),
          csvStringify({
            delimiter: ';',
            quote: '"',
            escape: '\\',
            columns: columnNames,
            header: true,
            encoding: 'utf8'
          }),
          pgStream
        ]);
      })
      .then(function() {
        reportTable(client, report, fetchedTable);
      });
  });
}

function reportTable(client, report, table) {
  if(report) {
    return client.queryp('select * from ' + table, []).then(function(result) {
      report[table] = result.rows || [];
    });
  }
  else {
    return q();
  }
}

function reportChanges(client, report, tableSuffix) {
  if(report) {
    return qUtil.reduce(['insert', 'update', 'delete'], function(memo, prefix) {
      return client.queryp('select * from ' + prefix +'_' + tableSuffix, []).then(function(result) {
        memo[prefix] = result.rows || [];
        return memo;
      });
    }, {}).then(function(changes) {
      report[tableSuffix] = changes;
    });
  }
  else {
    return q();
  }
}

/**
 * Given a map entityName -> rows fetched from API,
 * compute set of changes to be performed to bitemporal tables and store these changes in temp tables.
 * @param client
 * @param rowsMap
 */
function computeChangeSets (client, rowsMap, report) {
  return storeFetched(client, rowsMap, report).then(function() {
    return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'], function(entityName) {
      var spec = darSpec.spec[entityName];
      var changeTableColumnNames = darSpec.changeTableColumnNames(spec);
      var srcTable = 'fetched_' + entityName;
      var dstTable = 'dar_' + entityName;
      var select = selectList(srcTable, changeTableColumnNames);
      var insertsSql = format('CREATE TEMP TABLE insert_{dstTable} AS select {select} from {srcTable}' +
      ' WHERE NOT EXISTS(SELECT 1 FROM {dstTable} WHERE {dstTable}.versionid = {srcTable}.versionid)',
        {
          srcTable: srcTable,
          dstTable: dstTable,
          select: select
        });
      var updatesSql = format('CREATE TEMP TABLE update_{dstTable} AS SELECT {select} FROM {srcTable}' +
      ' LEFT JOIN {dstTable} ON {srcTable}.versionid = {dstTable}.versionid' +
      ' WHERE NOT upper_inf({srcTable}.registrering) AND' +
      ' {dstTable}.versionid IS NOT NULL' +
      ' AND upper_inf({dstTable}.registrering)',
        {
          srcTable: srcTable,
          dstTable: dstTable,
          select: select
        });
      return client.queryp(insertsSql, [])
        .then(function() {
          return client.queryp(updatesSql, []);
        })
        .then(function() {
          return client.queryp(format('CREATE TEMP TABLE delete_{dstTable}' +
          '(versionid integer not null)', {
            dstTable: dstTable
          }), []);
        }).then(function() {
          return reportChanges(client, report, dstTable);
        });
    });
  })
    .then(function() {
      return qUtil.mapSerial(
        [darSpec.spec.streetname, darSpec.spec.postnr, darSpec.spec.supplerendebynavn],
        function(spec) {
          return createEmptyChangeTables(client, spec.table, spec.table, spec);
      });
    });
}

/**
 * Given a number of new records for adgangspunkt, husnummer and adresse,
 * store/update these in the database and update the DAWA model.
 * @param client
 * @param rowsMap
 * @returns promise
 */
exports.applyDarChanges = function (client, rowsMap, report) {
  return computeChangeSets(client, rowsMap, report)
    .then(function() {
      return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'],
        function(specName) {
          var spec = darSpec.spec[specName];
          return applyChanges(client, spec.table, spec.table, spec, false);
        });
    })
    .then(function () {
      return computeDirtyObjects(client, report);
    })
    .then(function () {
      return performDawaChanges(client);
    })
    .then(function() {
      return qUtil.mapSerial(Object.keys(darSpec.spec), function(specName) {
        var spec = darSpec.spec[specName];
        return dropModificationTables(client, spec.table);
      });
    })
    .then(function() {
      return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'], function(specName) {
        return dropTable(client, 'fetched_' + specName);
      });
    })
    .then(function() {
      return qUtil.mapSerial(['adgangsadresser', 'enhedsadresser', 'vejstykker'], function(table) {
        return dropTable(client, 'dirty_' + table);
      });
    });

};

function getDawaSeqNum(client) {
  return client.queryp('SELECT MAX(sequence_number) as seqnum FROM transaction_history', [])
    .then(function (result) {
      return (result.rows && result.rows[0].seqnum) || -1;
    });
}

exports.beginDarTransaction = function(client) {
  return getDawaSeqNum(client).then(function(dawaSeqNum) {
    return client.queryp("SET work_mem='256MB'; UPDATE dar_tx_current SET tx_current = COALESCE((SELECT max(id) FROM dar_transaction), 0) + 1").then(function() {
      return dawaSeqNum;
    });
  });
};


function hasModifiedDar(client) {
  function hasModifiedBitemporal(tableName) {
    return 'EXISTS(SELECT * FROM ' + tableName + ' WHERE coalesce(tx_expired, tx_created) = (SELECT tx_current FROM dar_tx_current))';
  }
  function hasModifiedMonotemporal(tableName) {
    return 'EXISTS(SELECT * FROM ' + tableName + ' WHERE COALESCE(upper(registrering), lower(registrering)) = CURRENT_TIMESTAMP)';
  }
  var hasModifiedSql = _.map(darSpec.spec, function(spec, specName) {
    if(spec.bitemporal) {
      return hasModifiedBitemporal(spec.table);
    }
    else {
      return hasModifiedMonotemporal(spec.table);
    }
  }).join(' OR ');
  return client.queryp('SELECT (' + hasModifiedSql + ') AS modified').then(function(result) {
    return result.rows[0].modified;
  });
}

exports.endDarTransaction = function(client, prevDawaSeqNum, source)
{
  var currentDawaSeqNum;
  return getDawaSeqNum(client)
    .then(function (dawaSeqNum) {
      currentDawaSeqNum = dawaSeqNum;
      console.log('prevDawaSeqNum: ' + prevDawaSeqNum + ' currentDawaSeqNum: ' + currentDawaSeqNum);
      return hasModifiedDar(client);
    })
    .then(function(hasModifiedDar) {
      // We only create a transaction entry if we made any changes.
      if((currentDawaSeqNum !== prevDawaSeqNum) || hasModifiedDar) {
        return client.queryp('INSERT INTO dar_transaction(id, source, dawa_seq_range) VALUES ((SELECT tx_current FROM dar_tx_current),$1, $2)',
          [source, new Range(prevDawaSeqNum, currentDawaSeqNum, '(]')]);
      }
    })
    .then(function () {
      return client.queryp('UPDATE dar_tx_current SET tx_current = NULL');
    });
};

exports.withDarTransaction = function(client, source, transactionFn) {
  var prevDawaSeqNum;
  return exports.beginDarTransaction(client).then(function(dawaSeqNum) {
    prevDawaSeqNum = dawaSeqNum;
    return transactionFn(client);
  }).then(function() {
    return exports.endDarTransaction(client, prevDawaSeqNum, source);
  });
};

exports.loadCsvFile = loadCsvFile;
exports.updateTableFromCsv = updateTableFromCsv;
exports.initFromDar = initFromDar;
exports.updateFromDar = updateFromDar;
exports.initDarTables = initDarTables;

exports.internal = {
  createTableAndLoadData: createTableAndLoadData,
  computeDifferences: computeDifferences,
  storeFetched: storeFetched,
  computeChangeSets: computeChangeSets,
  computeDirtyObjects: computeDirtyObjects,
  computeAndApplyCsvChanges: computeAndApplyCsvChanges,
  createTempTableForCsvContent: createTempTableForCsvContent
};