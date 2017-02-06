"use strict";
const pg = require('pg');
const  databaseTypes = require('./databaseTypes');

// We want timestamps to be parsed into text (ISO format in UTC).
module.exports = function setupTypes(types, typeMap) {
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
  types.setTypeParser(TIMESTAMPTZ_OID, parseTimestampTz);
  types.setTypeParser(JSONB_OID, parseJsonFn);
  types.setTypeParser(JSON_OID, parseJsonFn);
  types.setTypeParser(TSTZRANGE_OID, function(val) {
    return databaseTypes.Range.fromPostgres(val, parseTimestampTz);
  });

  var husnrOid = typeMap.husnr;
  types.setTypeParser(husnrOid, databaseTypes.Husnr.fromPostgres);
  var husnrRangeOid = typeMap.husnr_range;
  types.setTypeParser(husnrRangeOid, function(val) {
    return databaseTypes.Range.fromPostgres(val, databaseTypes.Husnr.fromPostgres);
  });
};
