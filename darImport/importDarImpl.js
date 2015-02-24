"use strict";

var assert = require('chai').assert;
var copyFrom = require('pg-copy-streams').from;
var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var es = require('event-stream');
var fs = require('fs');
var nodeUuid =  require('node-uuid');
var q = require('q');
var _ = require('underscore');

var proddb = require('../psql/proddb');

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

exports.load = function(client, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
};

exports.loadCsvFile = loadCsvFile;

exports.internal = {
  transform: transform,
  types: types,
  postgresTimePeriod: postgresTimePeriod,
  csvSpec: csvSpec
};