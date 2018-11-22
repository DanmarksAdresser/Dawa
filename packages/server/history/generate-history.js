#!/usr/bin/env node
"use strict";

const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const generateHistoryImpl = require('./generateCombinedHistoryImpl');
const logger = require('@dawadk/common/src/logger').forCategory('generateHistoryDar1');
const proddb = require('../psql/proddb');
const { go } = require('ts-csp');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

runImporter('generateHistory', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE_CONCURRENT', function (client) {
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
});
