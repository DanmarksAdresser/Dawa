"use strict";

const initialization = require('./initialization');
const proddb = require('./proddb');
const path = require('path');
const scriptDir = path.join(__dirname, 'schema');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const schema = {
  database_url: {
    doc: 'URL som anvendes ved forbindelse til databasen',
    format: '*',
    cli: true,
    sensitive: true,
    required: true,
    default: null
  },
};

runConfigured(schema, [], (config => {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', function(client) {
    return initialization.reloadDatabaseCode( client, scriptDir);
  }).done();
}));
