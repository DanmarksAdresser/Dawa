"use strict";

var pg = require('pg.js');

// We want timestamps to be parsed into text (ISO format in UTZ).

var TIMESTAMPTZ_OID = 1184;
var standardDateParser = pg.types.getTypeParser(TIMESTAMPTZ_OID, 'text');

pg.types.setTypeParser(TIMESTAMPTZ_OID, function(val) {
  var date = standardDateParser(val);
  return date ? date.toISOString() : date;
});

