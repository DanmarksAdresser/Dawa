"use strict";

var cluster = require('cluster');
var winston = require('winston');


var _ = require('underscore');

var levels = {
  "error": 10, // system malfunction
  "warn": 9, // Something bad happened, but not necessarily system malfunction (e.g. client errors, disconnects)
  "info": 8, // Useful information e.g. timing, statistics. Default log level
  "debug": 7 // Information only useful for debugging purposes
};

var winstonLogger = winston;
var thresholds = {};
var defaultThreshold = levels.debug;
var initialized = false;
exports.initialize = function(logOptions) {
  if(initialized){
    doLog(winston, 'error', 'logger', 'Attempted to configure logger more than once');
    return;
  }
  logOptions = logOptions || {};
  var filenamePrefix = cluster.isMaster ? 'master-' : process.pid + '-';
  var directory = logOptions.directory || '.';
  var fileNameSuffix = logOptions.fileNameSuffix;
  var maxSize = logOptions.maxSize || 100000000;
  var maxFiles = logOptions.maxFiles || 10;
  if(fileNameSuffix) {
    winstonLogger =  new (winston.Logger)({
      transports: [
        new (winston.transports.File)({
          timestamp: true,
          maxSize: maxSize,
          maxFiles: maxFiles,
          filename: directory + '/' + filenamePrefix + fileNameSuffix})
      ]
    });
  }
  else {
    winstonLogger = winston;
  }
  defaultThreshold = levels[logOptions.defaultLevel || 'debug'];
  if(logOptions.levels) {
    thresholds = _.reduce(logOptions.levels, function(memo, value, key) {
      if(!levels[value]) {
        throw new Error("Bad log level ' + value + ' in log options");
      }
      memo[key] = levels[value];
      return memo;
    }, {});
  }
  else {
    thresholds = {};
  }
  initialized = true;
};

function doLog(winstonLogger, level, category, msg, values) {
  // check the log level is valid
  if(!levels[level]) {
    exports.log('error', 'Bad log level used', {
      level: level
    });
    exports.log('error', category, msg, values);
    return;
  }

  var threshold = thresholds[category] || defaultThreshold;

  // check if the log should be discarded due to log level settings in log configuration
  if(levels[level] < threshold) {
    return;
  }

  values = values || {};
  // buld meta data object for winston
  var meta;
  if (values instanceof Error && values.stack) {
    meta = {
      stack: values.stack
    };
  }
  else {
    meta = _.clone(values);

    // for errors, we always want a stack trace
    if(levels[level] >= levels.error) {
      if(meta.error === undefined) {
        meta.stack = new Error().stack;
      }
    }
  }
  meta.category = category;


  winstonLogger.log(level, msg, meta);
}

// export shorthand versions
_.keys(levels).forEach(function(level) {
  exports[level] = function(category, msg, values) {
    exports.log(level, category, msg, values);
  };
});

exports.log = function(level, category, msg, values) {
  doLog(winstonLogger, level, category, msg, values);
};

// create a logger for a specific category
exports.forCategory = function(category) {
  var categoryLogger = {
    log: function(level, msg, values) {
      exports.log(level, category, msg, values);
    }
  };
  _.keys(levels).forEach(function(level) {
    categoryLogger[level] = function(msg, values) {
      exports.log(level, category, msg, values);
    };
  });
  return categoryLogger;
};

exports.setThreshold = function(category, threshold) {
  thresholds[category] = levels[threshold];
};