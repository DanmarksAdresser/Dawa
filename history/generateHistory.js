"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var generateHistoryImpl = require('./generateHistoryImpl');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return q.async(function*() {
      try {
        yield generateHistoryImpl.generateAdgangsadresserHistory(client);
        yield generateHistoryImpl.generateAdresserHistory(client);
      }
      catch(err) {
        logger.error('Caught error in generateHistory', err);
        throw err;
      }
    })();
  }).done();
});
