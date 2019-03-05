#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/transaction-util');

const { importDownload, importDownloadIncrementally } = require('./importDarImpl');
const schema = {
  data_dir: {
    doc: 'Directory with NDJSON files to import',
    format: 'string',
    cli: true,
    required: true
  },
  refresh_derived: {
    doc: 'Genberegn afledte tabeller',
    format: 'boolean',
    default: false,
    cli: true
  }
}
runConfiguredImporter('importDar10', schema, function (config) {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      if(config.refresh_derived) {
        yield importDownload(client, txid, config.get('data_dir'));
      }
      else {
        yield importDownloadIncrementally(client, txid, config.get('data_dir'));
      }
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
}, 60 * 60 * 3);
