#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const convictSchema = {
  file: {
    format: 'string',
    doc: 'Fil med stednavne',
    required: true,
    default: null,
    cli: true
  },
  max_changes: {
    format: 'int',
    doc: 'Maximalt antal ændringer der udføres på adressetilknytninger',
    default: 50000,
    cli: true
  }
};

runConfiguredImporter('stednavne', convictSchema, config => go(function* () {
  const importStednavneImpl = require('./importStednavneImpl');
  const proddb = require('../psql/proddb');
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client =>
    importStednavneImpl.importStednavne(client,
      config.get('file'),
      config.get('max_changes')));
}));

