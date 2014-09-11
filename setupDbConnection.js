"use strict";

var pg = require('pg.js');

// We want timestamps to be parsed into text (ISO format in UTC).

var TIMESTAMPTZ_OID = 1184;
var TIMESTAMP_OID = 1114;
var JSONB_OID = 3802;
var JSON_OID = 114;
var standardTimestampTzParser = pg.types.getTypeParser(TIMESTAMPTZ_OID, 'text');

pg.types.setTypeParser(TIMESTAMPTZ_OID, function(val) {
  var date = standardTimestampTzParser(val);
  return date ? date.toISOString() : date;
});

pg.types.setTypeParser(TIMESTAMP_OID, function(val) {
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
pg.types.setTypeParser(JSONB_OID, parseJsonFn);
pg.types.setTypeParser(JSON_OID, parseJsonFn);