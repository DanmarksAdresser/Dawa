"use strict";

var assert = require('chai').assert;
var copyFrom = require('pg-copy-streams').from;
var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var format = require('string-format');
var fs = require('fs');
var nodeUuid =  require('node-uuid');
var q = require('q');
var _ = require('underscore');

var types = {
  uuid: {
    parse: _.identity
  },
  timestampDk: {
    parse: function(str) {
      var millis = Date.parse(str);
      assert.isNumber(millis, "Date " + str + " could be parsed");
      return new Date(millis).toISOString().replace('T', ' ');
      //return moment.tz(str, 'Europe/Copenhagen').toISOString();
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
  }
};

var filenames = {
  accesspoint: 'Accesspoint.csv'
}

var csvSpec = {
  accesspoint: {
    bitemporal: true,
    idColumns: ['id'],
    columns: [
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
        type: types.timestampDk
      }]
  },
  housenumber: {
    bitemporal: true,
    idColumns: ['id'],
    columns: [
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
        type: types.string
      },
      {
        name: 'ikrafttraedelsesdato',
        type: types.timestampDk
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
    ]
  },
  address: {
    bitemporal: true,
    idColumns: ['id'],
    columns: [
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
        type: types.timestampDk
      }
    ]
  },
  streetname: {
    bitemporal: false,
    idColumns: ['kommunekode', 'vejkode'],
    columns: [
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
        type: types.timestampDk
      },
      {
        name: 'oprettimestamp',
        type: types.timestampDk
      },
      {
        name: 'ophoerttimestamp',
        type: types.timestampDk
      }
    ]
  }
};

var divergenceDatamodel = _.reduce(csvSpec, function(memo, spec) {
  memo[spec.name] = {
    name: spec.name,
    table: 'dar_' + spec.name,
    key: spec.idColumns,
    columns: _.pluck(spec.columns, 'name')
  };
  return memo;
}, {});

function postgresTimePeriod(from, to) {
  return  (from  ? '[' + from : '(infinity') + ', ' + (to ? to : 'infinity') + ')';
}

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
    var from = parseStr(types.timestampDk, csvRow[name + 'start']);
    var to = parseStr(types.timestampDk, csvRow[name + 'slut']);
    return postgresTimePeriod(from, to);
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
  else {
    result.versionid = nodeUuid.v4();
  }
  return result;
}

/**
 * Create a pipeline of streams. Returns a promise, which
 * is resolved when all data is sent through all the streams.
 * @param streams
 * @returns {*}
 */
function promisingStreamCombiner(streams) {
  return q.Promise(function(resolve, reject) {
    streams.reduce(function(memo, stream) {
      return memo.pipe(stream);
    });
    streams.forEach(function(stream) {
      stream.on('error', reject);
    })
    streams[streams.length-1].on('end', function() {
      resolve();
    });
  });
}

function loadCsvFile(client, filePath, tableName, spec) {
  var columnNames = _.pluck(spec.columns, 'name');
  columnNames.push('versionid');
  if(spec.bitemporal) {
    columnNames = columnNames.concat(['registrering', 'virkning']);
  }
  var sql = "COPY " + tableName + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', NULL '')";
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
    es.mapSync(function(row) {
      return row;
    }),
    pgStream
  ]);
}

function updateVejstykker(client) {
}

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
  return client.queryp(
    format("CREATE TEMP TABLE {targetTable} AS SELECT {desiredTable}.* FROM {desiredTable} LEFT JOIN {table}" +
      " ON {desiredTable}.versionid = {table}.versionid" +
      " WHERE {table}.versionid IS NOT NULL AND {desiredTable}.registrering is distinct from {table}.registrering",
      {table: table, targetTable: targetTable, desiredTable: desiredTable}),
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

/**
 * Takes to bitemporal tables as input. Compute sets of records to insert, update or delete
 * in order for table to have the same content as desiredTable. These are inserted into
 * insert_<targetTableSuffix>, update_<targetTableSuffix> and delete_<targetTableSuffix> tables.
 *
 * The method assumes that rows are unmodified except for the registrering time.
 */

function computeDifferencesFast(client, table, desiredTable, targetTableSuffix) {
  return computeInserts(client, table, desiredTable, 'insert_' + targetTableSuffix)
    .then(function () {
      return computeUpdates(client, table, desiredTable, 'update_' + targetTableSuffix);
    })
    .then(function () {
      return computeDeletes(client, table, desiredTable, 'delete_' + targetTableSuffix);
    });
}

function createTableAndLoadData(client, filePath, targetTable, templateTable, spec) {
  return client.queryp('CREATE TEMP TABLE ' + targetTable + ' (LIKE ' + templateTable + ')', [])
    .then(function() {
      return loadCsvFile(client, filePath, targetTable, spec);
    });
}

function computeChangesFromCsv(client, spec, filePath) {
  var tablename = 'dar_' + spec.name;
  var tmpTablename = 'tmp_' + spec.name;
  var changedTablename = 'changed_' + spec.name;
  return createTableAndLoadData(client, filePath, tmpTablename, tablename, spec)
    .then(function () {
      return client.queryp('CREATE TEMP TABLE (' + changedTablename + ' LIKE ' + tablename + ')', []);
    })
    .then(function () {
      return client.queryp('INSERT INTO ' + changedTablename + '(SELECT tmp.* FROM ' + tmpTablename +
      ' AS tmp LEFT JOIN ' + tablename + ' tab ON tmp.versionid = tab.versionid' +
      " tab.versionid IS NULL or tab.registrering <> tmp.registrering)", []);
    })
    .then(function () {
      return client.queryp('DROP TABLE ' + tmpTablename, []);
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
function applyUpdates(client, destinationTable, sourceTable) {
  var sql = format(
    "UPDATE {destinationTable} SET registrering = {sourceTable}.registrering FROM {sourceTable} WHERE" +
    " {sourceTable}.versionid = {destinationTable}.versionid",
    {destinationTable: destinationTable, sourceTable: sourceTable});
  return client.queryp(sql, []);
}

function applyDeletes(client, destinationTable, sourceTable) {
  var sql = format("DELETE FROM {destinationTable} USING {sourceTable}" +
    " WHERE {destinationTable}.versionid = {sourceTable}.versionid",
    {destinationTable: destinationTable, sourceTable: sourceTable});
  return client.queryp(sql, []);
}

/**
 * Note: FAST version - does not check contents
 */
function applyChanges(client, targetTable, changeTablesSuffix) {
  return applyInserts(client, targetTable, 'insert_' + changeTablesSuffix)
    .then(function () {
      return applyUpdates(client, targetTable, 'update_' + changeTablesSuffix);
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
 * Note: FAST version - does not check contents of table, only row existence + registration interval.
 * The  temp tables containing inserts, updates and deletes is not dropped.
 * @param client postgres client
 * @param csvFilePath path to the CSV file with authoritative content of the table
 * @param destinationTable the table to be updated to contain the same as the CSV file
 * @param csvSpec
 * @returns {*}
 */
function updateBitemporalTableFromCsv(client, csvFilePath, destinationTable, csvSpec) {
  return createTableAndLoadData(client, csvFilePath, 'desired_' + destinationTable, destinationTable, csvSpec)
    .then(function () {
      return computeDifferencesFast(client, destinationTable, 'desired_' + destinationTable, destinationTable);
    })
    .then(function () {
      return applyChanges(client, destinationTable, destinationTable);
    })
    .then(function() {
      return dropTable(client, 'desired_' + destinationTable);
    });
}

exports.load = function(client, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
};

exports.loadCsvFile = loadCsvFile;
exports.updateBitemporalTableFromCsv = updateBitemporalTableFromCsv;

exports.internal = {
  transform: transform,
  types: types,
  postgresTimePeriod: postgresTimePeriod,
  csvSpec: csvSpec,
  computeInserts: computeInserts,
  computeUpdates: computeUpdates,
  computeDeletes: computeDeletes,
  computeDifferencesFast: computeDifferencesFast,
  createTableAndLoadData: createTableAndLoadData
};