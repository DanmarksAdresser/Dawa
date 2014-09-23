"use strict";

// This script loads postnumre into the database from a CSV-file.

var _         = require('underscore');
var Q = require('q');
var fs = require('fs');

var sqlCommon = require('./common');
var datamodels = require('../crud/datamodel');
var dataUtil = require('./dataUtil');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var logger = require('../logger');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  var inputFile = args[0];
  var connString = options.pgConnectionUrl;
  sqlCommon.withWriteTransaction(connString, function(err, client, commit) {
    if(err) {
      throw err;
    }
    updateEjerlavImpl(client, inputFile).then(function() {
      return Q.nfcall(commit, null);
    }).then(function() {
      console.log('complete');
    }).done();
  });
});
