#!/usr/bin/env node
"use strict";

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const generateHistoryImpl = require('./generateCombinedHistoryImpl');
const logger = require('@dawadk/common/src/logger').forCategory('generateHistoryDar1');
const proddb = require('../psql/proddb');
const { go } = require('ts-csp');


const schema = {};
runConfiguredImporter('generateHistory', schema, config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE_CONCURRENT', function (client) {
    client.allowParallelQueries = true;
    return go(function*() {
      try {
        yield generateHistoryImpl.generateHistory(client, '2018-05-05T00:00:00.000Z');
        logger.info("Successfully generated history");
      }
      catch(err) {
        logger.error('Caught error in generateHistory', err);
        throw err;
      }
    });
  });
}));
