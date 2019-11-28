#!/usr/bin/env node
"use strict";

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const { go } = require('ts-csp');

require('sax').MAX_BUFFER_LENGTH = 512 * 1024;


const schema = {
  data_dir: {
    doc: 'Directory containing OIS CSV files',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  file_name: {
    doc: 'Import only one file',
    format: 'string',
    default: null,
    cli: true
  },
  clean: {
    doc: 'Clean database before importing',
    format: 'boolean',
    default: false,
    cli: true
  },
  entities: {
    doc: 'Import only select entities - comma-separated list',
    format: 'string',
    default: null,
    cli: true
  }
};

runConfiguredImporter('ois', schema, config => go(function*() {
  const importOisImpl = require('./importOisImpl');
  const proddb = require('../psql/proddb');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });
  yield     proddb.withTransaction('READ_WRITE_CONCURRENT',  (client) => go(function*() {
    yield importOisImpl.importOis(client, config.get('data_dir'), config.get('file_name'), config.get('clean'),
      config.get('entities') ? config.get('entities').split(',') : null);
  }));
}));
