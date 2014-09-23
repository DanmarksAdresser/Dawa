"use strict";

// Loading large-mail-recievers (stormodtagere)
// ============================================
//
// This script will re-load all large-mail-recievers into a given
// database.
//
// Required modules
var _         = require('underscore');

var loadStormodtagereImpl = require('./loadStormodtagereImpl');

var sqlCommon = require('./common');
var logger = require('../logger').forCategory('stormodtagere');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  var connString = options.pgConnectionUrl;

  logger.info('Indlæser stormodtagere fra fil ' + inputFile);

  sqlCommon.withWriteTransaction(connString, function(err, client, done){
    if(err) {
      logger.error('Could not connect to database', err);
      throw err;
    }
    loadStormodtagereImpl(client, inputFile, function(err) {
      done(err, function(err) {
        if(err) throw err;
        logger.info("completed successfully");
      });
    });

  });
});
