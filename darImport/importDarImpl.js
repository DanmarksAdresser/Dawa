"use strict";

var assert = require('chai').assert;
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
var loadAdresseDataImpl = require('../psql/load-adresse-data-impl');
var logger = require('../logger').forCategory('darImport');
var promisingStreamCombiner = require('../promisingStreamCombiner');
var sqlCommon = require('../psql/common');
var tema = require('../temaer/tema');
var temaer = require('../apiSpecification/temaer/temaer');
var qUtil = require('../q-util');

var Husnr = databaseTypes.Husnr;
var Range = databaseTypes.Range;
var GeometryPoint2d = databaseTypes.GeometryPoint2d;

var DAWA_TABLES = ['enhedsadresser', 'adgangsadresser', 'vejstykker'];

var DAWA_COLUMNS_TO_CHECK = {
  vejstykke: datamodels.vejstykke.columns,
  adgangsadresse: _.without(datamodels.adgangsadresse.columns, 'ejerlavkode', 'matrikelnr', 'esrejendomsnr'),
  adresse: datamodels.adresse.columns
};

var csvHusnrRegex = /^(\d*)([A-Z]?)$/;
var types = {
  uuid: {
    parse: _.identity
  },
  timestamp: {
    parse: function(str) {
      var millis = Date.parse(str);
      assert.isNumber(millis, "Date " + str + " could be parsed");
      return new Date(millis).toISOString();
    }
  },
  string: {
    parse: _.identity
  },
  integer: {
    parse: function(str) {
      return parseInt(str, 10);
    }
  },
  float: {
    parse: function(str) {
      return parseFloat(str);
    }
  },
  husnr: {
    parse: function(str) {
      if(!str) {
        return null;
      }
      str = str.trim();
      if(str === '') {
        return null;
      }
      var match = csvHusnrRegex.exec(str);
      if(!match) {
        logger.error('Unable to parse husnr: ' + str);
        return null;
      }
      var tal;
      if(match[1] !== '') {
        tal = parseInt(match[1], 10);
      }
      else {
        tal = 0;
      }
      var bogstav = match[2] ? match[2] : null;
      return new Husnr(tal, bogstav);
    }
  }
};

function transformInterval(val) {

  var lower = val.byhusnummerfra;
  delete val.byhusnummerfra;
  var upper = val.byhusnummertil;
  delete val.byhusnummertil;
  val.husnrinterval = new Range(lower, upper, '[]');
  if(Husnr.lessThan(upper, lower)) {
    logger.error("Invalid husnr interval: " + val.husnrinterval.toPostgres());
    val.husnrinterval = new Range(null, null, 'empty');
  }
  return val;
}

function transformPostnr(val) {
  val = transformInterval(val);
  val.side = val.vejstykkeside;
  delete val.vejstykkeside;
  return val;
}

function transformSupplerendebynavn(val) {
  val = transformInterval(val);
  if(!val) {
    return;
  }
  val.side = val.byvejside;
  delete val.byvejside;
  return val;
}

var accesspointCsvColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'nord',
    type: types.float
  },
  {
    name: 'oest',
    type: types.float
  },
  {
    name: 'tekniskstandard',
    type: types.string
  },
  {
    name: 'noejagtighedsklasse',
    type: types.string
  },
  {
    name: 'retning',
    type: types.float
  },
  {
    name: 'placering',
    type: types.integer
  },
  {
    name: 'kommunenummer',
    type: types.integer
  },
  {
    name: 'esdhreference',
    type: types.string
  },
  {
    name: 'journalnummer',
    type: types.string
  },
  {
    name: 'revisionsdato',
    type: types.timestamp
  }];

var housenumberCsvColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'adgangspunktid',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'husnummer',
    type: types.husnr
  },
  {
    name: 'ikrafttraedelsesdato',
    type: types.timestamp
  },
  {
    name: 'vejnavn',
    type: types.string
  },
  {
    name: 'postnummer',
    type: types.integer
  },
  {
    name: 'postdistrikt',
    type: types.string
  },
  {
    name: 'bynavn',
    type: types.string
  }
];

var addressColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'husnummerid',
    type: types.integer
  },
  {
    name: 'etagebetegnelse',
    type: types.string
  },
  {
    name: 'doerbetegnelse',
    type: types.string
  },
  {
    name: 'esdhreference',
    type: types.string
  },
  {
    name: 'journalnummer',
    type: types.string
  },
  {
    name: 'ikrafttraedelsesdato',
    type: types.timestamp
  }];

var streetnameColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'navn',
    type: types.string
  },
  {
    name: 'adresseringsnavn',
    type: types.string
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var postnrColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'byhusnummerfra',
    type: types.husnr
  },
  {
    name: 'byhusnummertil',
    type: types.husnr
  },
  {
    name: 'vejstykkeside',
    type: types.string
  },
  {
    name: 'postdistriktnummer',
    type: types.integer
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var supplerendebynavnColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'byhusnummerfra',
    type: types.husnr
  },
  {
    name: 'byhusnummertil',
    type: types.husnr
  },
  {
    name: 'byvejside',
    type: types.string
  },
  {
    name: 'bynavn',
    type: types.string
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var csvSpec = {
  accesspoint: {
    filename: 'Adgangspunkt.csv',
    table: 'dar_adgangspunkt',
    bitemporal: true,
    idColumns: ['id'],
    columns: accesspointCsvColumns,
    dbColumns: _.without(_.pluck(accesspointCsvColumns, 'name'), 'oest', 'nord').concat('geom'),
    transform: function(val) {
      var oest = val.oest;
      delete val.oest;
      var nord = val.nord;
      delete val.nord;
      var srid = 25832;
      if(!oest || !nord) {
        val.geom = null;
      }
      else {
        val.geom = new GeometryPoint2d(oest, nord, srid);
      }
      return val;
    }
  },
  housenumber: {
    filename: 'Husnummer.csv',
    table: 'dar_husnummer',
    bitemporal: true,
    idColumns: ['id'],
    columns: housenumberCsvColumns,
    dbColumns: _.pluck(housenumberCsvColumns, 'name')
  },
  address: {
    filename: 'Adresse.csv',
    table: 'dar_adresse',
    bitemporal: true,
    idColumns: ['id'],
    columns: addressColumns,
    dbColumns: _.pluck(addressColumns, 'name')

  },
  streetname: {
    filename: 'Vejnavn.csv',
    table: 'dar_vejnavn',
    bitemporal: false,
    idColumns: ['id'],
    columns: streetnameColumns,
    dbColumns: _.pluck(streetnameColumns, 'name')
  },
  postnr: {
    filename: 'Vejstykke.csv',
    table: 'dar_postnr',
    bitemporal: false,
    idColumns: ['id'],
    columns: postnrColumns,
    dbColumns: _.without(_.pluck(postnrColumns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'vejstykkeside').concat(['husnrinterval', 'side']),
    transform: transformPostnr
  },
  supplerendebynavn: {
    filename: 'SupplerendeBynavn.csv',
    table: 'dar_supplerendebynavn',
    bitemporal: false,
    idColumns: ['id'],
    columns: supplerendebynavnColumns,
    dbColumns: _.without(_.pluck(supplerendebynavnColumns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'byvejside').concat(['husnrinterval', 'side']),
    transform: transformSupplerendebynavn
  }
};

function transform(spec, csvRow) {
  function parseStr(type, str) {
    if(str === undefined || str === null) {
      return null;
    }
    str = str.trim();
    if(str === '') {
      return null;
    }
    return type.parse(str);
  }
  function parseTimeInterval(name) {
    var from = parseStr(types.timestamp, csvRow[name + 'start']);
    var to = parseStr(types.timestamp, csvRow[name + 'slut']);
    if(!from) {
      from = null;
    }
    if(!to) {
      to = null;
    }
    return new Range(from, to, '[)');
  }
  var result = spec.columns.reduce(function(memo, colSpec) {
    var str = csvRow[colSpec.name];
    memo[colSpec.name] = parseStr(colSpec.type, str);
    return memo;
  }, {});
  if(spec.bitemporal) {
    result.versionid = parseStr(types.integer, csvRow.versionid);
    result.registrering = parseTimeInterval('registrering');
    result.virkning = parseTimeInterval('virkning');
  }
  if(spec.transform) {
    result = spec.transform(result);
    if(!result) {
      return;
    }
  }
  Object.keys(result).forEach(function(key) {
    if(result[key] && result[key].toPostgres) {
      result[key] = result[key].toPostgres();
    }
  });
  return result;
}

function loadCsvFile(client, filePath, tableName, spec) {
  var columnNames = spec.dbColumns;
  if(spec.bitemporal) {
    columnNames = columnNames.concat(['versionid', 'registrering', 'virkning']);
  }
  var sql = "COPY " + tableName + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  var pgStream = client.query(copyFrom(sql));
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
    es.mapSync(function (csvRow) {
      return transform(spec, csvRow);
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

function columnsNullClause(alias, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias}.{column} IS NULL', {
      alias: alias,
      column: column
    });
  });
  return '(' + clauses.join(' AND') + ')';
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

function createTableAndLoadData(client, filePath, targetTable, templateTable, spec) {
  return client.queryp('CREATE TEMP TABLE ' + targetTable + ' (LIKE ' + templateTable + ')', [])
    .then(function() {
      if(!spec.bitemporal) {
        return client.queryp(format(' ALTER TABLE {targetTable} DROP registrering;' +
        ' ALTER TABLE {targetTable} DROP versionid;', {
          targetTable: targetTable
        }), []);
      }
    })
    .then(function() {
      return loadCsvFile(client, filePath, targetTable, spec);
    });
}

function applyInserts(client, destinationTable, sourceTable, spec) {
  var sql;
  if(spec.bitemporal) {
    sql = format("INSERT INTO {destinationTable} SELECT * FROM {sourceTable}",
      {destinationTable: destinationTable, sourceTable: sourceTable});
  }
  else {
    sql = format("INSERT INTO {destinationTable}({dstColumnList})" +
    " (SELECT {srcColumnList} FROM {sourceTable})",
      {
        destinationTable: destinationTable,
        sourceTable: sourceTable,
        dstColumnList: selectList(undefined, spec.dbColumns),
        srcColumnList: selectList(sourceTable, spec.dbColumns)
      });
  }
  return client.queryp(sql, []);
}

function applyUpdates(client, destinationTable, sourceTable, spec, updateAllFields) {
  if(spec.bitemporal) {
    var columnsToUpdate = ['registrering'];
    if(updateAllFields) {
      columnsToUpdate = columnsToUpdate.concat(['virkning']).concat(spec.dbColumns);
    }
    return applyUpdates2(client, sourceTable, destinationTable,['versionid'], columnsToUpdate);
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

function applyChanges(client, targetTable, changeTablesSuffix, csvSpec, updateAllFields) {
  return applyInserts(client, targetTable, 'insert_' + changeTablesSuffix, csvSpec)
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
 * Update a table to have same contents as a CSV file. During this process,
 * temp tables with inserts, updates and deletes are produced. These are not dropped.
 * @param client postgres client
 * @param csvFilePath path to the CSV file with authoritative content of the table
 * @param destinationTable the table to be updated to contain the same as the CSV file
 * @param csvSpec
 * @param useFastComparison For bitemporal tables, skip comparison of each field.
 * @returns {*}
 */
function updateTableFromCsv(client, csvFilePath, destinationTable, csvSpec, useFastComparison) {
  return createTableAndLoadData(client, csvFilePath, 'desired_' + destinationTable, destinationTable, csvSpec)
    .then(function() {
      console.log('computing differences');
      return computeDifferences(client, destinationTable, 'desired_' + destinationTable, destinationTable, csvSpec, useFastComparison);
    })
    .then(function() {
      console.log('applying changes');
      return applyChanges(client, destinationTable, destinationTable, csvSpec, !useFastComparison);
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
function computeDirtyObjects(client) {
  function computeDirtyVejstykker() {
    console.log('dirty_vejstykker');
    return executeExternalSqlScript(client, 'dirty_vejstykker.sql');
  }
  function computeDirtyAdgangsadresser() {
    console.log('dirty_adgangsadresser');
    return executeExternalSqlScript(client, 'dirty_adgangsadresser.sql');
  }
  function computeDirtyAdresser(){
    console.log('dirty_adresser');
    return executeExternalSqlScript(client, 'dirty_enhedsadresser.sql');
  }
  return computeDirtyVejstykker()
    .then(computeDirtyAdgangsadresser)
    .then(computeDirtyAdresser);
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
      });
  });
}

/**
 * Remove all data from DAR tables
 */
function clearDarTables(client) {
  return qUtil.mapSerial(csvSpec, function(spec) {
    return client.queryp('DELETE FROM ' + spec.table, []);
  });
}

/**
 * Initialize DAR tables from CSV, assuming they are empty.
 * Loads data directly into the tables from CSV.
 */
function initDarTables(client, dataDir) {
  return qUtil.mapSerial(csvSpec, function(spec, entityName) {
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
      console.log('initializing table ' + tableName);
      var sql = format("INSERT INTO {table} (SELECT * FROM dar_{table}_view)",
        {
          table: tableName
        });
      return client.queryp(sql, []);
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
  return qUtil.mapSerial(csvSpec, function(spec, entityName) {
    console.log('Importing ' + entityName);
    return updateTableFromCsv(client, path.join(dataDir, spec.filename), spec.table, spec, false);
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
      return qUtil.mapSerial(csvSpec, function(spec) {
        return dropChangeTables(client, spec.table);
      });
    });
}

exports.loadCsvFile = loadCsvFile;
exports.updateTableFromCsv = updateTableFromCsv;
exports.csvSpec = csvSpec;
exports.initFromDar = initFromDar;
exports.updateFromDar = updateFromDar;

exports.internal = {
  transform: transform,
  types: types,
  createTableAndLoadData: createTableAndLoadData,
  computeDifferences: computeDifferences
};