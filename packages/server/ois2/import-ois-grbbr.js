#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const importGrbbr = require('./import-grbbr-impl');
const proddb = require('../psql/proddb');

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
  }
};
runConfiguredImporter('import-ois-grbbr', schema, (config) => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    yield importGrbbr(client, config.get('data_dir'), config.get('verify'));
  }));
}));
