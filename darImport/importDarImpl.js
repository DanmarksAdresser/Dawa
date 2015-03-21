"use strict";

var assert = require('chai').assert;
var copyFrom = require('pg-copy-streams').from;
var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var format = require('string-format');
var fs = require('fs');
var q = require('q');
var _ = require('underscore');

var databaseTypes = require('../psql/databaseTypes');
var datamodels = require('../crud/datamodel');
var promisingStreamCombiner = require('../promisingStreamCombiner');

var Husnr = databaseTypes.Husnr;
var Range = databaseTypes.Range;
var GeometryPoint2d = databaseTypes.GeometryPoint2d;

var csvHusnrRegex = /^(\d+)([A-Z])?/;
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
      var match = csvHusnrRegex.exec(str);
      var tal = parseInt(match[1], 10);
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
  val.side = val.byvejside;
  delete val.byvejside;
  return val;
}

var accesspointCsvColumns = [
  {
    name: 'id',
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
    type: types.uuid
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
    type: types.uuid
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
    idColumns: ['kommunekode', 'vejkode'],
    columns: streetnameColumns,
    dbColumns: _.pluck(streetnameColumns, 'name')
  },
  postnr: {
    filename: 'Vejstykke.csv',
    table: 'dar_postnr',
    bitemporal: false,
    idColumns: ['kommunekode', 'vejkode','side', 'husnrinterval'],
    columns: postnrColumns,
    dbColumns: _.without(_.pluck(postnrColumns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'vejstykkeside').concat(['husnrinterval', 'side']),
    transform: transformPostnr
  },
  supplerendebynavn: {
    filename: 'supplerendeBynavn.csv',
    table: 'dar_supplerendebynavn',
    bitemporal: false,
    idColumns: ['kommunekode', 'vejkode','side', 'husnrinterval'],
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
    result.versionid = parseStr(types.uuid, csvRow.versionid);
    result.registrering = parseTimeInterval('registrering');
    result.virkning = parseTimeInterval('virkning');
  }
  if(spec.transform) {
    result = spec.transform(result);
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
    escape: '\\',
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

function selectList(columns) {
  return columns.join(', ');
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
  return columnsEqualClause(alias1, alias2, spec.idColumns);
}

function nonKeyFieldsDifferClause(alias1, alias2, spec) {
  var columns = _.difference(_.pluck(spec.columns, 'name'),spec.idColumns);
  return columnsDifferClause(alias1, alias2, columns);
}


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
    function computeInserts(client, table, desiredTable, targetTable) {
      return client.queryp(
        format("CREATE TEMP TABLE {targetTable} AS SELECT {desiredTable}.* FROM {desiredTable} LEFT JOIN {table}" +
          " ON {desiredTable}.versionid = {table}.versionid" +
          " WHERE {table}.versionid IS NULL",
          {table: table, targetTable: targetTable, desiredTable: desiredTable}),
        []);
    }

    function computeUpdates(client, table, desiredTable, targetTable) {
      var sql = "CREATE TEMP TABLE {targetTable} AS SELECT {desiredTable}.* FROM {desiredTable} LEFT JOIN {table}" +
        " ON {desiredTable}.versionid = {table}.versionid" +
        " WHERE {table}.versionid IS NOT NULL AND ({desiredTable}.registrering is distinct from {table}.registrering" +
        " OR {desiredTable}.virkning IS DISTINCT FROM {table}.virkning";
      if(!useFastComparison) {
        sql += ' OR {columnsDifferClause}';
      }
      sql += ')';
      return client.queryp(
        format(sql,
          {
            table: table,
            targetTable: targetTable,
            desiredTable: desiredTable,
            columnsDifferClause: columnsDifferClause(table, desiredTable, spec.dbColumns)
          }),
        []);
    }

    function computeDeletes(client, table, desiredTable, targetTable) {
      return client.queryp(
        format("CREATE TEMP TABLE {targetTable} AS SELECT {table}.versionid FROM {table} LEFT JOIN {desiredTable}" +
          " ON {desiredTable}.versionid = {table}.versionid" +
          " WHERE {desiredTable}.versionid IS NULL",
          {table: table, targetTable: targetTable, desiredTable: desiredTable}),
        []);
    }

    return computeInserts(client, table, desiredTable, 'insert_' + targetTableSuffix)
      .then(function () {
        return computeUpdates(client, table, desiredTable, 'update_' + targetTableSuffix);
      })
      .then(function () {
        return computeDeletes(client, table, desiredTable, 'delete_' + targetTableSuffix);
      });
  }

  if(!spec.bitemporal) {
    return computeDifferencesMonotemporal();
  }
  else {
    return computeDifferencesBitemporal();
  }
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

function applyInserts(client, destinationTable, sourceTable) {
  var sql = format("INSERT INTO {destinationTable} SELECT * FROM {sourceTable}",
    {destinationTable: destinationTable, sourceTable: sourceTable});
  return client.queryp(sql, []);
}

/**
 * Note: FAST version - does not check contents
 */
function applyUpdates(client, destinationTable, sourceTable, spec, updateAllFields) {
  var fieldUpdates = ', ' + spec.dbColumns.map(function(column) {
    return format('{column} = {sourceTable}.{column}', {
      column: column,
        sourceTable: sourceTable
    });
  }).join(', ');
  var sql = format(
    "UPDATE {destinationTable} SET registrering = {sourceTable}.registrering, virkning={sourceTable}.virkning {fieldUpdates}" +
    " FROM {sourceTable}" +
    " WHERE {sourceTable}.versionid = {destinationTable}.versionid",
    {
      destinationTable: destinationTable,
      sourceTable: sourceTable,
      fieldUpdates: updateAllFields ? fieldUpdates : ''
    });
  return client.queryp(sql, []);
}

function applyDeletes(client, destinationTable, sourceTable) {
  var sql = format("DELETE FROM {destinationTable} USING {sourceTable}" +
    " WHERE {destinationTable}.versionid = {sourceTable}.versionid",
    {destinationTable: destinationTable, sourceTable: sourceTable});
  return client.queryp(sql, []);
}

function applyChanges(client, targetTable, changeTablesSuffix, csvSpec, updateAllFields) {
  return applyInserts(client, targetTable, 'insert_' + changeTablesSuffix)
    .then(function () {
      return applyUpdates(client, targetTable, 'update_' + changeTablesSuffix, csvSpec, updateAllFields);
    }).then(function () {
      return applyDeletes(client, targetTable, 'delete_' + changeTablesSuffix);
    });
}

function dropTable(client, tableName) {
  return client.queryp('DROP TABLE ' + tableName,[]);
}

function dropChangeTables(client, tableSuffix) {
  return dropTable(client, 'insert_' + tableSuffix)
    .then(function() {
      return dropTable(client, 'update_' + tableSuffix);
    })
    .then(function() {
      return dropTable(client, 'delete_' + tableSuffix);
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
      return computeDifferences(client, destinationTable, 'desired_' + destinationTable, destinationTable, csvSpec, useFastComparison);
    })
    .then(function() {
      return applyChanges(client, destinationTable, destinationTable, csvSpec, !useFastComparison);
    })
    .then(function() {
      return dropTable(client, 'desired_' + destinationTable);
    });
}

function performDawaChangesVejstykker(client) {
  var datamodel = datamodels.vejstykke;
  var table = 'datamodel.table';
  var modifiedTable = 'modified_' + table;
  var select = "select kommunekode, vejkode FROM insert_streetname" +
    " UNION select komunekode, vejkode FROM update_streetname" +
    " UNION SELECT kommunekode,vejkode FROM delete_streetname";

  return client.queryp(format('CREATE TEMP TABLE {modifiedTable} AS ({select})', {
    modifiedTable: modifiedTable,
    select: select
  }), [])
    .then(function() {
    client.queryp(format('INSERT INTO {table}' +
    ' (SELECT * FROM dar_{table}_view dv' +
    ' WHERE NOT EXISTS(SELECT *  FROM {table} tab WHERE {idColumnsEqualClause} ))',
      {
        table: table,
        idColumnsEqualClause: columnsEqualClause('dv', 'tab', datamodel.key)
      }), []);
  })
    .then(function() {
      var updateColumnsClause
      client.queryp('UPDATE vejstykker SET ')
    });
}

exports.load = function(client, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
};

exports.loadCsvFile = loadCsvFile;
exports.updateTableFromCsv = updateTableFromCsv;

exports.internal = {
  transform: transform,
  types: types,
  csvSpec: csvSpec,
  createTableAndLoadData: createTableAndLoadData,
  computeDifferences: computeDifferences
};