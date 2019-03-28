#!/usr/bin/env node
"use strict";

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const importVejmidterImpl = require('./importVejmidterImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');
const logger = require('@dawadk/common/src/logger').forCategory('Vejmidter');
const { go } = require('ts-csp');
const s3ConvictSchema = require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema');
const configHolder = require('@dawadk/common/src/config/holder');


const schema = configHolder.mergeConfigSchemas([{
  file: {
    doc: 'File containing road centers',
    format: 'string',
    default: null,
    required: true,
    cli: true
  }
}, s3ConvictSchema]);

runConfiguredImporter('vejmidter', schema, config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importVejmidter", (txid) =>
      importVejmidterImpl.importVejmidter(client,txid, config.get("file"))));
  logger.info('Successfully imported vejmidter');
}));
