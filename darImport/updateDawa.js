"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  skipEvents: [false, 'Opdater DAWA uden udsendelse af hændelser', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return importDarImpl.withDarTransaction(client, 'csv', function() {
      return importDarImpl.fullCompareAndUpdate(client, options.skipEvents, null);
    });
  }).catch(function(err) {
    logger.error('Caught error in importNewFields', err);
    return q.reject(err);
  })
    .done();
});