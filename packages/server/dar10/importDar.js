#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/transaction-util');
const {makeAllChangesNonPublic} = require('@dawadk/import-util/src/materialize');

const { importDownload, importDownloadIncrementally } = require('./importDarImpl');
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  noEvents: [false, 'Undlad at danne hændelser for ændringer','boolean', false],
  refreshDerived: [false, 'Genberegn afledte tabeller', 'boolean', false]
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      if(options.refreshDerived) {
        yield importDownload(client, txid, options.dataDir);
      }
      else {
        yield importDownloadIncrementally(client, txid, options.dataDir);
      }
      if(options.noEvents) {
        yield makeAllChangesNonPublic(client, txid);
      }
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
});
