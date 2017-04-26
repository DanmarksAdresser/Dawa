"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var generateHistoryImpl = require('./generateHistoryImpl');
var logger = require('../logger').forCategory('generateHistory');
var proddb = require('../psql/proddb');
const { go } = require('ts-csp');


var optionSpec = {
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
        yield generateHistoryImpl.generateAdgangsadresserHistory(client);
        yield generateHistoryImpl.generateAdresserHistory(client);
        logger.info("Successfully generated history");
      }
      catch(err) {
        logger.error('Caught error in generateHistory', err);
        throw err;
      }
    });
  }).done();
});
