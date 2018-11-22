#!/usr/bin/env node
"use strict";

const { go } = require('ts-csp');
const q = require('q');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');
const importJordstykkerImpl = require('./importJordstykkerImpl');

const optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false],
  refresh: [false, 'Genindlæs alle jordstykker', 'boolean', false]
};

q.longStackSupport = true;

runImporter('matrikelkortet', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importJordstykker',
        txid =>
          importJordstykkerImpl.importJordstykkerImpl(
            client, txid, options.sourceDir, options.refresh));
  }));
});
