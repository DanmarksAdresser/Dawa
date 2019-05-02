"use strict";

const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const tableSchema = require('./tableModel');
const {reloadDatabaseCode} = require('./initialization');
const path = require('path');
const { applyCurrentTableToChangeTable } = require('@dawadk/import-util/src/table-diff');

const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    }
  },
  require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema')
]);

runConfigured(schema, [],config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
    yield client.query('UPDATE vejstykker t set oprettet = v.oprettet FROM vejstykker_view v WHERE v.kommunekode= t.kommunekode AND v.kode = t.kode');
    yield applyCurrentTableToChangeTable(client, tableSchema.tables.vejstykker, ['oprettet']);
  }));
}));
