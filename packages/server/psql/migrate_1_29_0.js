"use strict";

const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {reloadDatabaseCode} = require('./initialization');
const path = require('path');

const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    }
  }]);

runConfigured(schema, [],config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield client.query('ALTER TABLE navngivenvej_postnummer_changes ALTER public DROP NOT NULL');
    yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
  }));
}));
