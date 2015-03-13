"use strict";

var pg = require('pg.js');
var pgConnectionString = require('pg-connection-string');
var q = require('q');
var TypeOverrides = require('pg.js/lib/type-overrides');
var _ = require('underscore');

var database = require('./database');
var databaseTypes = require('./databaseTypes');
var logger = require('../logger').forCategory('sql');

// We want timestamps to be parsed into text (ISO format in UTC).

function setupTypes(types, typeMap) {
  var TSTZRANGE_OID = 3910;
  var TIMESTAMPTZ_OID = 1184;
  var TIMESTAMP_OID = 1114;
  var JSONB_OID = 3802;
  var JSON_OID = 114;
  var standardTimestampTzParser = pg.types.getTypeParser(TIMESTAMPTZ_OID, 'text');

  function parseTimestampTz(val) {
    var date = standardTimestampTzParser(val);
    return date ? date.toISOString() : date;
  }

  var tstzrangeRegex = /([\(\[])(".*"|infinity),(".*"|infinity)([\)\]])/;

  function parseTstzrange(val) {
    if(!val) {
      return null;
    }
    if(val === 'empty') {
      return { empty: true };
    }
    var match = tstzrangeRegex.exec(val);
    if(!match) {
      logger.error('Could not parse timestamp range: ' + val);
      return null;
    }
    var result = { empty: false };
    result.lowerOpen = match[1] === '(';
    result.upperOpen = match[4] === ')';
    result.lowerInfinite = match[2] === 'infinity';
    result.upperInfinite = match[3] === 'infinity';
    result.lower = result.lowerInfinite ? null : parseTimestampTz(match[2]);
    result.upper = result.upperInfinite ? null  : parseTimestampTz(match[3]);
    return result;
  }

  types.setTypeParser(TIMESTAMPTZ_OID, parseTimestampTz);
  types.setTypeParser(TSTZRANGE_OID, parseTstzrange);

  types.setTypeParser(TIMESTAMP_OID, function(val) {
    var timestampRegex = /(\d{1,}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.(\d{1,}))?/;

    var match = timestampRegex.exec(val);

    var datePart = match[1];
    var timePart = match[2];
    var milliPart = match[4];
    if(!milliPart) {
      milliPart = '000';
    }
    return datePart + 'T' + timePart + '.' + milliPart;
  });

  var parseJsonFn = function (val) {
    if (val) {
      return JSON.parse(val);
    }
    else {
      return null;
    }
  };
  types.setTypeParser(JSONB_OID, parseJsonFn);
  types.setTypeParser(JSON_OID, parseJsonFn);

  var husnrOid = typeMap['husnr'];
  types.setTypeParser(husnrOid, databaseTypes.Husnr.fromPostgres);
  var husnrRangeOid = typeMap['husnr_range'];
  types.setTypeParser(husnrRangeOid, function(val) {
    return databaseTypes.Range.fromPostgres(val, databaseTypes.Husnr.fromPostgres);
  });
}

module.exports = function(dbname, connectionString) {
  if(database.exists(dbname)) {
    return q();
  }
  var options = pgConnectionString.parse(connectionString);
  var untypedDb = database.create('untyped_' + dbname, options);
  database.withConnection(untypedDb, false, function(client) {
    // The OIDs for custom types are not fixed beforehand, so we query them from the database
    return client.queryp('select typname, oid from pg_type', []).then(function(result) {
      var typeMap = _.reduce(result.rows, function(memo, row){
        memo[row.typname] = row.oid;
        return memo;
      }, {});
      var types = new TypeOverrides(pg.types);
      setupTypes(types, typeMap);
      options.types = types;
      database.register(dbname, options);
    });
  }).done();
};