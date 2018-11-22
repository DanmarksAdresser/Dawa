#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');
const {makeAllChangesNonPublic} = require('@dawadk/import-util/src/materialize');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  skipDawa: [false, 'Skip DAWA updates', 'boolean', false],
  clear: [false, 'Ryd gamle DAR 1.0 data', 'boolean', false],
  noEvents: [false, 'Undlad at danne hændelser for ændringer','boolean', false]
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      if (options.clear) {
        yield importDarImpl.clearDar(client);
        yield importDarImpl.importInitial(client, txid, options.dataDir, options.skipDawa);
      }
      else {
        yield importDarImpl.importIncremental(client, txid, options.dataDir, options.skipDawa);
      }
      if(options.noEvents) {
        yield makeAllChangesNonPublic(client, txid);
      }
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
});
