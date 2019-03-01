"use strict";

const {go} = require('ts-csp');
const initialization = require('./initialization');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const logger = require('@dawadk/common/src/logger');
const proddb = require('./proddb');
const { initializeData } = require('./data-initialization');
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  proddb.withTransaction('READ_WRITE', (client) => go(function*() {
      // load schemas
      yield initialization.initializeSchema(client);
      yield initializeData(client);
  })).done();
});

