#!/usr/bin/env node
"use strict";

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const {go} = require('ts-csp');


const schema = {};
runConfiguredImporter('generateHistory', schema, config => go(function* () {
    const generateHistoryImpl = require('./generateCombinedHistoryImpl');
    const logger = require('@dawadk/common/src/logger').forCategory('generateHistoryDar1');
    const proddb = require('../psql/proddb');
    const {withImportTransaction} = require('../importUtil/transaction-util');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', (client) =>
    withImportTransaction(client, 'generateHistory', txid => go(function* () {
      client.allowParallelQueries = true;
      yield generateHistoryImpl.generateHistory(client, txid, '2018-05-05T00:00:00.000Z');
      logger.info("Successfully generated history");

    })));
}));
