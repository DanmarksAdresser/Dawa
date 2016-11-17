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

var bitemporal = require('./bitemporal');
var csvSpecs = require('./csvSpec');
var csvSpecUtil = require('./csvSpecUtil');
var databaseTypes = require('../psql/databaseTypes');
var datamodels = require('../crud/datamodel');
var dawaDbSpec = require('./dawaDbSpec');
var dbSpec = require('./dbSpec');
var dbSpecUtil = require('./dbSpecUtil');
var initialization = require('../psql/initialization');
var logger = require('../logger').forCategory('darImport');
var monotemporal = require('./monotemporal');
var nontemporal = require('./nontemporal');
var promisingStreamCombiner = require('../promisingStreamCombiner');
var sqlCommon = require('../psql/common');
var sqlUtil = require('./sqlUtil');
var tema = require('../temaer/tema');
var temaer = require('../apiSpecification/temaer/temaer');
var qUtil = require('../q-util');
const tablediff = require('../importUtil/tablediff');

var selectList = sqlUtil.selectList;
var columnsEqualClause = sqlUtil.columnsEqualClause;
var Range = databaseTypes.Range;


function getImplForSpec(spec) {
  if(spec.temporality === 'bitemporal') {
    return bitemporal(spec);
  }
  else if(spec.temporality === 'monotemporal') {
    return monotemporal(spec);
  }
  else if(spec.temporality === 'nontemporal') {
    return nontemporal(spec);
  }
  throw new Error('Unknown temporality for spec');
}

var darDbSpecImpls = _.reduce(dbSpec, function(memo, spec, name) {
  memo[name] = getImplForSpec(spec);
  return memo;
}, {});

var dawaDbSpecImpls = _.reduce(dawaDbSpec, function(memo, spec, name) {
  memo[name] = getImplForSpec(spec);
  return memo;
}, {});


function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

function loadCsvFile(client, filePath, tableName, dbSpecImpl, csvSpec, rowsToSkip) {
  var dbColumnNames = dbSpecImpl.changeTableColumnNames;
  var pgStream = createCopyStream(client, tableName, dbColumnNames);

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
      return csvSpecUtil.transformCsv(csvSpec, csvRow);
    }),
    es.map(function(row, callback) {
      let invalid = false;
      ['registrering', 'virkning', 'dbregistrering'].forEach((field) => {
        if(row[`${field}start`] && row[`${field}slut`] &&
          Date.parse(row[`${field}start`]) > Date.parse(row[`${field}slut`])) {
          logger.info('Skipping row due to bad range' , {row: row});
          invalid = true;
        }
      });
      if(invalid) {
        callback();
      }
      else if(_.contains(rowsToSkip, row.versionid ))  {
        logger.info('Skipping row', {versionid: row.versionid});
        callback();
      }
      else {
        callback(null, row);
      }
    }),
    es.mapSync(function (entity) {
      return csvSpecUtil.transform(csvSpec, entity);
    }),
    csvStringify({
      delimiter: ';',
      quote: '"',
      escape: '\\',
      columns: dbColumnNames,
      header: true,
      encoding: 'utf8'
    }),
    pgStream
  ]);
}

/**
 * for bitemporal tables, delete any overlapping rows
 */
function deleteOverlappingRows(client, targetTable, dbSpecImpl) {
  return q.async(function*(){
    if (dbSpecImpl.temporality === 'bitemporal') {
      const result = yield client.queryp(
        `SELECT distinct a.versionid, a.id, a.registrering, a.virkning FROM ${targetTable} a JOIN ${targetTable} b ON a.id = b.id
         AND a.virkning && b.virkning AND a.registrering && b.registrering AND a.versionid <> b.versionid`);
      const overlapResult = result.rows || [];
      if(overlapResult.length === 0) {
        return;
      }
      const groupedResult = _.groupBy(overlapResult, 'id');
      const rowsToKeep = _.mapObject(groupedResult, rows => {
        // first, we remove the expired version ids
        const nonExpiredRows = rows.filter(row => !row.registrering.upper);
        if (nonExpiredRows.length <= 1) {
          return nonExpiredRows;
        }
        const currentRows = nonExpiredRows.filter(row => !row.virkning.upper);
        if (currentRows.length <= 1) {
          return currentRows;
        }
        // we keep the one with the highest virkningstart
        return [_.sortBy(currentRows, row => row.virkning.lower)[currentRows.length - 1]];
      });
      const rowsToDelete = _.mapObject(groupedResult, (rows, id) => {
        return rows.filter(row => !_.contains(rowsToKeep[id], row));
      });

      const versionIdsToDeleteMap = _.mapObject(rowsToDelete, rows => _.pluck(rows, 'versionid'));
      Object.keys(rowsToDelete).forEach(id => {
        logger.info('Deleting overlapping rows', {
          table: dbSpecImpl.table,
          id: id,
          versionIds: versionIdsToDeleteMap[id]
        });
      });
      const versionIdsToDelete = Object.keys(versionIdsToDeleteMap).reduce((memo, id) => memo.concat(versionIdsToDeleteMap[id]), []);
      yield client.queryp(`DELETE FROM ${targetTable} WHERE versionid IN (${versionIdsToDelete.join(', ')})`);
    }
  })();
}

function createTableAndLoadData(client, filePath, targetTable, dbSpecImpl, csvSpec, rowsToSkip) {
  return q.async(function*() {
    yield dbSpecUtil.createTempTableForCsvContent(client, targetTable, dbSpecImpl);
    yield loadCsvFile(client, filePath, targetTable, dbSpecImpl, csvSpec, rowsToSkip);

  })();
}


var dawaChangeOrder = [
  {
    type: 'insert',
    entity: 'vejstykke'
  },
  {
    type: 'update',
    entity: 'vejstykke'
  },
  {
    type: 'delete',
    entity: 'vejstykke'
  },
  {
    type: 'delete',
    entity: 'adresse'
  },
  {
    type: 'insert',
    entity: 'adgangsadresse'
  },
  {
    type: 'update',
    entity: 'adresse'
  },
  {
    type: 'update',
    entity: 'adgangsadresse'
  },
  {
    type: 'delete',
    entity: 'adgangsadresse'
  },
  {
    type: 'insert',
    entity: 'adresse'
  }
];

/**
 * After an update to DAWA tables without generating history, we update the *most recent* history record
 * to the new content. This ensures that recent udtræk is correct.
 * @param client
 */
function updateDawaHistory(client) {
  return qUtil.mapSerial(Object.keys(dawaDbSpecImpls), function(entityName) {
    var dbSpecImpl = dawaDbSpecImpls[entityName];
    var tableName = dbSpecImpl.table;
    var historyTableName = tableName + '_history';
    var setClause = dbSpecImpl.changeTableColumnNames.map(function(col) {
      return format("{col} = {table}.{col}", {
        col: col,
        table: tableName
      });
    }).join(", ");
    var keyEqualsClause = columnsEqualClause(tableName, historyTableName, dbSpecImpl.idColumns);
    var sql = format("UPDATE {historyTable}" +
      " SET {setClause} FROM {table}" +
      " WHERE {historyTable}.valid_to IS NULL AND {keyEqualsClause}",
      {
        table: tableName,
        historyTable: historyTableName,
        setClause: setClause,
        keyEqualsClause: keyEqualsClause
      });
    return client.queryp(sql);
  });
}

/*
 * Given tables has been created for each DAWA entity containing inserts, updates and deletes respectively,
 * perform the changes to the DAWA tables in the correct order (that is, e.g. ensuring that adgangsadresse
 * is not deleted before adresse).
 */
function doDawaChanges(client, skipEvents) {
  function applyChanges() {
    return qUtil.mapSerial(dawaChangeOrder, function(change) {
      var dbSpec = dawaDbSpecImpls[change.entity];
      var dbSpecImpl = dawaDbSpecImpls[change.entity];
      var table = dbSpec.table;
      logger.info('Applying change to DAWA table', change);
      if(change.type === 'insert') {
        return dbSpecImpl.applyInserts(client, table);
      }
      else if(change.type === 'update') {
        return dbSpecImpl.applyUpdates(client, table);
      }
      else if(change.type === 'delete') {
        return dbSpecImpl.applyDeletes(client, table);
      }
    });
  }
  if(skipEvents) {
    return sqlCommon.withoutHistoryTriggers(client, ['adgangsadresser', 'enhedsadresser', 'vejstykker'], applyChanges).then(function() {
      return updateDawaHistory(client);
    });
  }
  else {
    return applyChanges();
  }
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
 * Update a table to have same contents as a CSV file. During this process,
 * temp tables with inserts, updates and deletes are produced. These are not dropped.
 * @param client postgres client
 * @param csvFilePath path to the CSV file with authoritative content of the table
 * @param destinationTable the table to be updated to contain the same as the CSV file
 * @param csvSpec
 * @param useFastComparison For bitemporal tables, skip comparison of each field.
 * @returns {*}
 */
function updateTableFromCsv(client, csvFilePath, csvSpec, dbSpecImpl, useFastComparison, rowsToSkip, report) {
  return q.async(function*() {
    const desiredTable = 'desired_' + dbSpecImpl.table;
    yield createTableAndLoadData(client, csvFilePath, desiredTable, dbSpecImpl, csvSpec, rowsToSkip);
    yield deleteOverlappingRows(client, desiredTable, dbSpecImpl);
    const options = {
      useFastComparison: useFastComparison
    };
    yield dbSpecImpl.compareAndUpdate(client, desiredTable, dbSpecImpl.table, options, report);
    if(report) {
      yield reportChanges(client, report, dbSpecImpl.table);
    }
  })();
}

function executeExternalSqlScript(client, scriptFile) {
  return q.nfcall(fs.readFile, path.join(__dirname, 'scripts', scriptFile), {encoding: 'utf-8'}).then(function(sql) {
    return qUtil.mapSerial(sql.split(';'), function(stmt) {
      logger.info('external query', {query: stmt});
      return client.queryp(stmt);
    });
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

function performDawaChanges(client, report) {
  return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
    logger.debug('Computing changes for DAWA entity', {entity:  entityName});
    var dbSpecImpl = dawaDbSpecImpls[entityName];
    var tableName = dbSpecImpl.table;
    var idColumns = dbSpecImpl.idColumns;
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
        return dbSpecImpl.computeDifferences(client, 'desired_' + tableName, tableName, 'actual_' + tableName);
      })
      .then(function() {
        return client.queryp('DROP VIEW actual_' + tableName + '; DROP VIEW desired_' + tableName, []);
      });
  }).then(function() {
    return doDawaChanges(client);
  }).then(function() {
    return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
      var tableName = datamodels[entityName].table;
      return reportChanges(client, report, tableName).then(function() {
        return dropModificationTables(client, tableName);
      });
    });

  });
}

/**
 * Remove all data from DAR tables
 */
exports.clearDarTables = function(client) {
  return qUtil.mapSerial(darDbSpecImpls, function(dbSpecImpl) {
    logger.info('clearing DAR table', {table: dbSpecImpl.table});
    return client.queryp('DELETE FROM ' + dbSpecImpl.table, []);
  }).then(function() {
    return client.queryp('DELETE FROM dar_transaction; UPDATE dar_tx_current set tx_current = null; UPDATE dar_lastfetched SET lastfetched = NULL', []);
  });
};

/**
 * Initialize DAR tables from CSV, assuming they are empty.
 * Loads data directly into the tables from CSV.
 */
function initDarTables(client, dataDir, skipRowsConfig) {
  return qUtil.mapSerial(darDbSpecImpls, function(dbSpecImpl, entityName) {
    logger.info('Initializing dar table from CSV', {entity: entityName});
    var csvSpec = csvSpecs[entityName];
    return loadCsvFile(client, path.join(dataDir, csvSpec.filename), dbSpecImpl.table, dbSpecImpl, csvSpec, skipRowsConfig[entityName]);
  });
}

exports.clearDawa = function(client) {
  return sqlCommon.withoutTriggers(client, function() {
    return executeExternalSqlScript(client, 'clear_dawa.sql');
  });
};

exports.createFullViews = function(client) {
  return sqlCommon.withoutTriggers(client, function() {
    return executeExternalSqlScript(client, 'create_full_dawa_views.sql');
  });
};

exports.importNewFields = function(client) {
  return sqlCommon.withoutTriggers(client, function() {
    return executeExternalSqlScript(client, 'create_full_dawa_views.sql')
      .then(function() {
        return executeExternalSqlScript(client, 'import_new_fields.sql');
      });
  });
};

/**
 * Given that DAR tables are populated, initialize DAWA tables, assuming no
 * existing data is present in the tables.
 */
function initDawaFromScratch(client) {
  logger.info('initializing DAWA from scratch');
  return sqlCommon.withoutTriggers(client, function() {
    return executeExternalSqlScript(client, 'create_full_dawa_views.sql')
      .then(function() {
        logger.info('populating DAWA tables');
        return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
          var spec = dawaDbSpec[entityName];
          var table = spec.table;
          var sql = format("INSERT INTO {dawaTable}({columns}) SELECT {columns} FROM {view}",
            {
              dawaTable: table,
              columns: dawaDbSpec[entityName].columns.join(', '),
              view: 'full_' + table
            });
          return client.queryp(sql);
        });
      })
      .then(function () {
        logger.info('initializing history');
        return initialization.initializeHistory(client);
      })
      .then(function() {
        logger.info('initializing adresserTemaerView');
        return qUtil.mapSerial(temaer, function(temaSpec) {
          return tema.updateAdresserTemaerView(client, temaSpec, true, 100000000, false);
        });
      });
  });
}

/**
 * Assuming no data exists in DAR tables, initialize them from CSV.
 * (adgangsadresser, enhedsadresser, vejstykker, adgangsadresser_temaer_matview).
 * When DAR tables has been initialized, the DAWA tables will be updated as well (
 * from scratch, if clearDawa is specified, otherwise incrementally).
 */
function initFromDar(client, dataDir, clearDawa, skipDawa, skipRowsConfig) {
  return initDarTables(client, dataDir, skipRowsConfig)
    .then(function () {
      if(!skipDawa) {
        if (clearDawa) {
          return initDawaFromScratch(client);
        }
        else {
          return fullCompareAndUpdate(client, false);
        }
      }
    });
}

/**
 * Make a full comparison of DAWA state and DAR state, and perform the necessary updates to
 * the DAWA model
 * @param client
 */
function fullCompareAndUpdate(client, skipEvents, report) {
  logger.info('Performing full comparison and update');
  return executeExternalSqlScript(client, 'create_full_dawa_views.sql')
    .then(function() {
      return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
        logger.info('Computing differences for entity', {entityName: entityName});
        var dbSpecImpl = dawaDbSpecImpls[entityName];
        var dawaTable = dbSpecImpl.table;
        return dbSpecImpl.computeDifferences(client, 'full_' + dawaTable, dawaTable, dawaTable);
      });
    })
    .then(function() {
      return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
        var dbSpecImpl = dawaDbSpecImpls[entityName];
        var dawaTable = dbSpecImpl.table;
        return qUtil.mapSerial(['insert', 'update', 'delete'], function(op) {
          return client.queryp('select count(*) as c from ' + op + '_' + dawaTable).then(function(result) {
            logger.info('change count', {
              entityName: entityName,
              operation: op,
              changes: result.rows[0].c
            });
          });
        });
      });
    })
    .then(function() {
      logger.info('Applying changes to DAWA tables');
      return doDawaChanges(client, skipEvents);
    })
    .then(function() {
      return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
        var tableName = datamodels[entityName].table;
        return reportChanges(client, report, tableName).then(function() {
          return dropModificationTables(client, tableName);
        });
      });
    });
}

function updateVejstykkerPostnumreMat(client, initial) {
  return q.async(function*() {
    const selectVejstykkerPostnumreMat = `SELECT DISTINCT a.kommunekode, a.vejkode, a.postnr,
     COALESCE(v.vejnavn, '') || ' ' || to_char(p.nr, 'FM0000') || ' ' || COALESCE(p.navn, '') as tekst
    from adgangsadresser a
    JOIN vejstykker v ON a.kommunekode = v.kommunekode and a.vejkode = v.kode
    JOIN postnumre p ON a.postnr = p.nr`;
    yield client.queryp(`CREATE TEMP VIEW vejstykkerpostnumremat_view AS (${selectVejstykkerPostnumreMat})`);
    if(initial) {
      yield sqlCommon.disableHistoryTrigger(client, 'vejstykkerpostnumremat');
      yield client.queryp('INSERT INTO vejstykkerpostnumremat(kommunekode, vejkode, postnr, tekst) (SELECT * FROM vejstykkerpostnumremat_view)');
      yield client.queryp('INSERT INTO vejstykkerpostnumremat_history(kommunekode, vejkode, postnr)' +
        '(select kommunekode, vejkode, postnr FROM vejstykkerpostnumremat)');
      yield sqlCommon.enableHistoryTrigger(client, 'vejstykkerpostnumremat');
    }
    else {
      const idColumns = ['kommunekode', 'vejkode', 'postnr'];
      const nonIdColumns = ['tekst'];
      yield tablediff.computeDifferences(client, 'vejstykkerpostnumremat_view', 'vejstykkerpostnumremat', idColumns, nonIdColumns);
      yield tablediff.applyChanges(client, 'vejstykkerpostnumremat', 'vejstykkerpostnumremat', idColumns, idColumns.concat(nonIdColumns), nonIdColumns);
    }
    yield client.queryp('DROP VIEW vejstykkerpostnumremat_view');
  })();
}

/**
 * Assuming DAR tables are already populated, update DAR tables
 * from CSV, followed by an update of DAWA tables.
 */
function updateFromDar(client, dataDir, fullCompare, skipDawa, skipRowsConfig, report) {
  return q.async(function*() {

    for(let entityName of Object.keys(csvSpecs)) {
      const csvSpec = csvSpecs[entityName];
      const dbSpecImpl = darDbSpecImpls[entityName];
      yield updateTableFromCsv(
        client,
        path.join(dataDir, csvSpec.filename),
        csvSpec,
        dbSpecImpl, false, skipRowsConfig[entityName], report);
    }
    if(!skipDawa) {
      if(fullCompare) {
        yield fullCompareAndUpdate(client, false, report);
      }
      else {
        logger.debug('computing dirty objects');
        yield computeDirtyObjects(client, report);
        yield performDawaChanges(client, report);
      }
      yield updateVejstykkerPostnumreMat(client, false);
    }
    else {
      logger.info('Skipping DAWA updates');
    }
    for(let specImpl of _.values(darDbSpecImpls)) {
      yield dropChangeTables(client, specImpl.table);
    }
  })();
}

function storeRowsToTempTable(client, csvSpec, dbSpecImpl, rows, table, report) {
  var columnNames = dbSpecImpl.changeTableColumnNames;
  return client.queryp('CREATE TEMP TABLE ' + table +
  ' AS select ' + columnNames.join(', ') +
  ' FROM ' + dbSpecImpl.table +
  ' WHERE false', [])
    .then(function() {
      var pgStream = createCopyStream(client, table, columnNames);
      var inputStream = es.readArray(rows);
      return promisingStreamCombiner([
        inputStream,
        es.mapSync(function (csvRow) {
          return csvSpecUtil.transform(csvSpec, csvRow);
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
      return reportTable(client, report, table);
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
    var dbSpecImpl = darDbSpecImpls[entityName];
    var csvSpec = csvSpecs[entityName];
    var fetchedTable = 'fetched_' + entityName;
    var rows = rowsMap[entityName];
    return storeRowsToTempTable(client, csvSpec, dbSpecImpl, rows, fetchedTable, report);
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
      var dbSpecImpl = darDbSpecImpls[entityName];
      var changeTableColumnNames = dbSpecImpl.changeTableColumnNames;
      var srcTable = 'fetched_' + entityName;
      var dstTable = dbSpecImpl.table;
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
        [darDbSpecImpls.streetname, darDbSpecImpls.postnr, darDbSpecImpls.supplerendebynavn],
        function(spec) {
          return dbSpecUtil.createEmptyChangeTables(client, spec.table, spec);
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
exports.applyDarChanges = function (client, rowsMap, skipDawa, report) {
  return computeChangeSets(client, rowsMap, report)
    .then(function() {
      return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'],
        function(specName) {
          var dbSpecImpl = darDbSpecImpls[specName];
          return dbSpecUtil.applyChanges(client, dbSpecImpl, dbSpecImpl.table);
        });
    })
    .then(function() {
      return client.queryp('SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED', []);
    })
    .then(function () {
      if(!skipDawa) {
        return computeDirtyObjects(client, report)
          .then(function () {
            return performDawaChanges(client, report);
          })
          .then(function() {
            return qUtil.mapSerial(['adgangsadresser', 'enhedsadresser', 'vejstykker'], function(table) {
              return dropTable(client, 'dirty_' + table);
            });
          });
      }
    })
    .then(function() {
      return qUtil.mapSerial(Object.keys(darDbSpecImpls), function(specName) {
        var spec = darDbSpecImpls[specName];
        return dropModificationTables(client, spec.table);
      });
    })
    .then(function() {
      return qUtil.mapSerial(['adgangspunkt', 'husnummer', 'adresse'], function(specName) {
        return dropTable(client, 'fetched_' + specName);
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
  return client.queryp("select tx_current from dar_tx_current", function(result){
    var tx_current = result.rows[0].tx_current;
    function hasModifiedBitemporal(tableName) {
      return 'EXISTS(SELECT * FROM ' + tableName + ' WHERE $1 IN (tx_expired, tx_created))';
    }
    function hasModifiedMonotemporal(tableName) {
      return 'EXISTS(SELECT * FROM ' + tableName + ' WHERE COALESCE(upper(registrering), lower(registrering)) = CURRENT_TIMESTAMP)';
    }
    var hasModifiedSql  = _.map(darDbSpecImpls, function(specImpl) {
      if(specImpl.temporality === 'bitemporal') {
        return hasModifiedBitemporal(specImpl.table);
      }
      else {
        return hasModifiedMonotemporal(specImpl.table);
      }
    }).join(' OR ');
    return client.queryp('SELECT (' + hasModifiedSql + ') AS modified', [tx_current]).then(function(result) {
      return result.rows[0].modified;
    });
  });
}

exports.endDarTransaction = function(client, prevDawaSeqNum, source)
{
  var currentDawaSeqNum;
  return getDawaSeqNum(client)
    .then(function (dawaSeqNum) {
      currentDawaSeqNum = dawaSeqNum;
      logger.debug('Ending DAR transaction', {
        prevDawaSeqNum: prevDawaSeqNum,
        currentDawaSeqNum: currentDawaSeqNum
      });
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
exports.fullCompareAndUpdate = fullCompareAndUpdate;
exports.updateVejstykkerPostnumreMat = updateVejstykkerPostnumreMat;

exports.internal = {
  createTableAndLoadData: createTableAndLoadData,
  storeFetched: storeFetched,
  computeChangeSets: computeChangeSets,
  computeDirtyObjects: computeDirtyObjects,
  dawaDbSpecImpls: dawaDbSpecImpls,
  darDbSpecImpls: darDbSpecImpls,
  storeRowsToTempTable: storeRowsToTempTable
};
