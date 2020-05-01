#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const { tableSql } = require('./sql-gen');
const initialization = require('../psql/initialization');

const schema = {
  data_dir: {
    doc: 'Directory OIS files',
    format: 'string',
    cli: true,
    default: null,
    required: true
  },
  verify: {
    doc: 'Verify all tables',
    format: 'boolean',
    cli: true,
    default: false,
    required: true
  },
  clean: {
    doc: 'Clean all OIS data',
    format: 'boolean',
    cli: true,
    default: false,
    required: true
  }
};

const cleanBbr = (client) => go(function*() {
  yield client.query(tableSql);
  yield client.query(`delete from transaction_history where entity like 'bbr_%'`);
  yield initialization.reloadDatabaseCode(client);
});

runConfiguredImporter('import-ois-grbbr', schema, (config) => go(function* () {
  const importGrbbr = require('./import-grbbr-impl');
  const proddb = require('../psql/proddb');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    if(config.get('clean')) {
      yield cleanBbr(client);

    }
    yield importGrbbr(client, config.get('data_dir'), config.get('verify'));
  }));
}));
