#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/transaction-util');
const { allProcessors } = require('../components/processors/all-processors');

const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY } = require('../components/common');

const schema = {
  components: {
    doc: 'Komma-separeret liste af ID-er for componenter som skal genberegnes',
    format: 'String',
    cli: true,
    required: true
  }
};

runConfiguredImporter('recompute', schema, config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'recompute', (txid) => go(function*() {
      const componentIds = config.get('components').split(',');
      const rootComponents = allProcessors.filter(component => componentIds.includes(component.id));
      yield execute(client, txid, rootComponents, EXECUTION_STRATEGY.verify);
    }));
  }));
}));
