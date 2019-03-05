#!/usr/bin/env node
"use strict";

// Loading large-mail-recievers (stormodtagere)
// ============================================
//
// This script will re-load all large-mail-recievers into a given
// database.
//
const { go } = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const loadStormodtagereImpl = require('./loadStormodtagereImpl');
const proddb = require('./proddb');
const { withImportTransaction } = require('../importUtil/transaction-util');

const schema = {
  file: {
    doc: 'stormodtager-fil, som skal importeres',
    format: 'string',
    default: null,
    cli: true,
    required: true
  }
};

runConfiguredImporter('stormodtagere', schema, config => go(function*() {
  const inputFile = config.get('file');
  proddb.init({
    connString:config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', function(client){
    return withImportTransaction(client, 'updateStormodtagere', (txid) => {
      return loadStormodtagereImpl(client, txid, inputFile);
    })
  });
}));

