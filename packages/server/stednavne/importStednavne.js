#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const { withImportTransaction} = require('../importUtil/transaction-util');
const importStednavneImpl = require('./importStednavneImpl');
const proddb = require('../psql/proddb');
const s3ConvictSchema = require('@dawadk/import-util/src/config/schemas/s3-offload-schema');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const configHolder = require('@dawadk/common/src/config/holder');
const convictSchema = configHolder.mergeConfigSchemas([{
  file: {
    format: '*',
    doc: 'Fil med stednavne',
    cli: true
  },
  max_changes: {
    format: 'int',
    doc: 'Maximalt antal ændringer der udføres på adressetilknytninger',
    default: 50000,
    cli: true
  }
}, s3ConvictSchema]);

runConfiguredImporter('stednavne', convictSchema, config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importStednavne', txid => importStednavneImpl.importStednavne(client, txid,
      config.get('file'), config.get('max_changes')));
  }));
}));

