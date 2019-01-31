#!/usr/bin/env node
"use strict";

const _ = require('underscore');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const importVejmidterImpl = require('./importVejmidterImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/transaction-util');
const logger = require('@dawadk/common/src/logger').forCategory('Vejmidter');
const { go } = require('ts-csp');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med vejmidter', 'string'],
};

runImporter('vejmidter', optionSpec, _.keys(optionSpec),  (args, options) => go(function*() {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importVejmidter", (txid) =>
      importVejmidterImpl.importVejmidter(client,txid, options.file)));
  logger.info('Successfully imported vejmidter');
}));
