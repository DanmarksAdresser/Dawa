"use strict";

// this is not actually a test, we simply load this file to setup logging.

var fs = require('fs');
var q = require('q');

q.longStackSupport = true;

var logger = require('@dawadk/common/src/logger');

var logOptions;
if (process.env.logConfiguration) {
  var logOptionsStr = fs.readFileSync(process.env.logConfiguration);
  logOptions = JSON.parse(logOptionsStr);
}
else {
  logOptions = {};
}
/*eslint no-console:0*/
console.log("initializing logging with " + JSON.stringify(logOptions));
logger.initialize(logOptions);
