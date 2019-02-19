#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/transaction-util');
const { allProcessors } = require('../components/processors/all-processors');

const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY } = require('../components/common');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  components: [false, 'Komma-separeret liste af ID-er for componenter som skal genberegnes', 'string']
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'recompute', (txid) => go(function*() {
      const componentIds = options.components.split(',');
      const rootComponents = allProcessors.filter(component => componentIds.includes(component.id));
      yield execute(client, txid, rootComponents, EXECUTION_STRATEGY.verify);
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
}, 60 * 60 * 3);
