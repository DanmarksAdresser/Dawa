"use strict";

// This script loads postnumre into the database from a CSV-file.

var _         = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
var updatePostnumreImpl = require('./updatePostnumreImpl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', function(client) {
    return updatePostnumreImpl(client, inputFile);
  }).done();
});
