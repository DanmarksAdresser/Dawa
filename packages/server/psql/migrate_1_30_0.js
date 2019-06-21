"use strict";
const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const { generateTemaTable, generateTilknytningTable } = require('../dagiImport/sqlGen');
const { reloadDatabaseCode } = require('./initialization');
const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    },
    dagi_directory: {
    }
  },
  require('@dawadk/import-util/src/config/schemas/s3-offload-schema')
]);

runConfigured(schema, [],config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    yield client.query(generateTemaTable('landsdel'));
    yield client.query(generateTilknytningTable('landsdel'));
    yield client.query(fs.readFileSync(path.join(__dirname,'schema/tables/tilknytninger_mat.sql')));
    yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
  }));
}));
