"use strict";

// Loading large-mail-recievers (stormodtagere)
// ============================================
//
// This script will re-load all large-mail-recievers into a given
// database.
//
var _         = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var proddb = require('./proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];

  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function(client){
    return loadStormodtagereImpl(client, inputFile);
  }).done();
});
