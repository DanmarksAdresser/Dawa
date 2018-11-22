#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const { withImportTransaction} = require('../importUtil/transaction-util');
const importStednavneImpl = require('./importStednavneImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med stednavne', 'string'],
  maxChanges: [false, 'Maximalt antal ændringer der udføres på adressetilknytninger', 'number', 10000]
};

runImporter('stednavne', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importStednavne', txid => importStednavneImpl.importStednavne(client, txid, options.file, options.maxChanges));
  }));
});
