#!/usr/bin/env node
"use strict";
const { go } = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');

const schema = {
  data_dir: {
    doc: 'Directory where files are located',
    format: 'String',
    default: '.',
    cli: true
  },
  refresh: {
    doc: 'Import all files regardless of whether timestamps indicate any change',
    format: 'Boolean',
    default: false,
    cli: true
  }
}

runConfiguredImporter('matrikelkortet', schema, config => go(function*() {
  const { withImportTransaction} = require('../importUtil/transaction-util');
  const importJordstykkerImpl = require('./importJordstykkerImpl');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    yield withImportTransaction(client, 'importJordstykker',
      txid =>
        importJordstykkerImpl.importJordstykkerImpl(
          client, txid, config.get('data_dir'), config.get('refresh')));
  }));
}));
