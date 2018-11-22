#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const { withImportTransaction} = require('../importUtil/transaction-util');
const importBygninerImpl = require('./importBygningerImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med bygningspolygoner', 'string'],
  maxChanges: [false, 'Maximalt antal ændringer der udføres på adressetilknytninger', 'number', 10000]
};

runImporter('bygninger', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importBygninger', txid => importBygninerImpl.importBygninger(client, txid, options.file, options.maxChanges));
  }));
});
