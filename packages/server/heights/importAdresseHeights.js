#!/usr/bin/env node
"use strict";

const { go } = require('ts-csp');
const runConfiguredImporter  = require('@dawadk/import-util/src/run-configured-importer');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');

 const schema = {
  file: {
    doc: 'File containing address heights',
    format: 'string',
    default: null,
    required: true,
    cli: true
  }
};

runConfiguredImporter('højdeudtræk', schema, config=> go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importHeights", (txid) =>
      importAdresseHeightsImpl.importHeights(client,txid, config.get('file'))));
}));
