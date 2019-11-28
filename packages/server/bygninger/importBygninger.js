#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');

const schema = {
  file: {
    doc: 'Fil med bygningspolygoner',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  max_changes: {
    doc: 'Maximalt antal ændringer der udføres på adressetilknytninger',
    format: 'nat',
    default: 10000,
    cli: true
  }
};

runConfiguredImporter('bygninger', schema, config => go(function*() {
  const { withImportTransaction} = require('../importUtil/transaction-util');
  const importBygninerImpl = require('./importBygningerImpl');
  const proddb = require('../psql/proddb');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importBygninger', txid =>
      importBygninerImpl.importBygninger(client, txid, config.get('file'), config.get('max_changes')));
  }));
}));
