"use strict";

const {go} = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const { withImportTransaction} = require('../importUtil/transaction-util');
const importBrofasthedImpl = require('./importBrofasthedImpl');
const proddb = require('../psql/proddb');
const convictSchema = {
  file: {
    format: 'string',
    doc: 'Fil med brofasthed',
    required: true,
    default: null,
    cli: true
  }
};

runConfiguredImporter('brofasthed', convictSchema, config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importBrofasthed', txid => go(function*() {
      yield importBrofasthedImpl(client, txid, config.get('file'), false);

    }));
  }));
}));
