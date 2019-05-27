"use strict";

const { assert } = require('chai');
const {go} = require('ts-csp');
const fs = require('fs');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const temaModels = require('../dagiImport/temaModels').modelList;
const configHolder = require('@dawadk/common/src/config/holder');
const { createS3 } = require('@dawadk/import-util/src/s3-util');
const {uploadToS3} = require('@dawadk/import-util/src/s3-offload');
const {initChangeTable, createChangeTable} = require('@dawadk/import-util/src/table-diff');
const { name } = require('@dawadk/import-util/src/table-diff-protocol');
const { withImportTransaction, withMigrationTransaction } = require('../importUtil/transaction-util');
const tableSchema = require('./tableModel');
const { generateHistory } = require('../history/generateCombinedHistoryImpl');
const {reloadDatabaseCode} = require('./initialization');
const path = require('path');
const { applyCurrentTableToChangeTable } = require('@dawadk/import-util/src/table-diff');
const { generateTemaTable, generateTilknytningTable } = require('../dagiImport/sqlGen');
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
  }));
}));
