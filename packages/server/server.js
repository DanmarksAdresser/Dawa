#!/usr/bin/env node
"use strict";

const Promise = require('bluebird');

Promise.config({
  longStackTraces: false
});

const cluster = require('cluster');
const logger = require('@dawadk/common/src/logger');

require('./server/memlogging');

if(cluster.isMaster) {
  require('./server/master');
}
else {
  require('./server/worker');
}


process.on('uncaughtException', function(err) {
  /* eslint no-console: 0 */
  console.log('Uncaught exception', err);
  logger.error('uncaughtException', 'An uncaught exception occured, terminating process', err);
  process.exit(1);
});

