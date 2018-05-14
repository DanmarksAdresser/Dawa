"use strict";

const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const generateHistoryImpl = require('./generateCombinedHistoryImpl');
const logger = require('../logger').forCategory('generateHistoryDar1');
const proddb = require('../psql/proddb');
const { go } = require('ts-csp');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    client.allowParallelQueries = true;
    return go(function*() {
      try {
        yield generateHistoryImpl.generateHistory(client, '2018-04-05T00:00:00.000Z');
        logger.info("Successfully generated history");
      }
      catch(err) {
        logger.error('Caught error in generateHistory', err);
        throw err;
      }
    });
  }).done();
});
