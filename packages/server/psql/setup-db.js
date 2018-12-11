"use strict";

const { go } = require('ts-csp');
const path = require('path');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const initialization = require('./initialization');
const proddb = require('./proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  const scriptDir = path.join(__dirname, 'schema');
  proddb.withTransaction('READ_WRITE',  client => go(function*() {
    yield initialization.loadSchemas(client, scriptDir);
    yield initialization.disableTriggersAndInitializeTables(client);
  })).done();
});
