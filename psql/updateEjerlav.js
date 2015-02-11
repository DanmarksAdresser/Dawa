"use strict";

// This script loads ejerlav into the database from a CSV-file.

var _         = require('underscore');
var Q = require('q');

var proddb = require('./proddb');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var logger = require('../logger');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  var inputFile = args[0];
  proddb.withTransaction('READ_WRITE', function(client) {
    return updateEjerlavImpl(client, inputFile);
  }).done();
});
