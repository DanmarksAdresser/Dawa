"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
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
    return q()
      .then(function() {
        return importDarImpl.importNewFields(client);
      })
      .then(function() {
        return client.queryp('analyze;');
      });
  }).catch(function(err) {
    logger.error('Caught error in importNewFields', err);
    return q.reject(err);
  })
    .done();
});