#!/usr/bin/env node
"use strict";

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const importVejmidterImpl = require('./importVejmidterImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');
const logger = require('@dawadk/common/src/logger').forCategory('Vejmidter');
const { go } = require('ts-csp');


const schema = {
  file: {
    doc: 'File containing road centers',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  verify: {
    doc: 'Kontroller afledte tabeller',
    format: 'boolean',
    default: false,
    cli: true
  }
};

runConfiguredImporter('vejmidter', schema, config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importVejmidter", (txid) =>
      importVejmidterImpl.importVejmidter(client,txid, config.get("file"), config.get('verify'))));
  logger.info('Successfully imported vejmidter');
}));
