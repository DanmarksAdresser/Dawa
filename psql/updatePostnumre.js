"use strict";

// This script loads postnumre into the database from a CSV-file.

var _         = require('underscore');
var Q = require('q');

var sqlCommon = require('./common');

var updatePostnumreImpl = require('./updatePostnumreImpl');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  var connString = options.pgConnectionUrl;
  sqlCommon.withWriteTransaction(connString, function(err, client, commit) {
    if(err) {
      throw err;
    }
    updatePostnumreImpl(client, inputFile).then(function() {
      return Q.nfcall(commit, null);
    }).then(function() {
      console.log('complete');
    }).done();
  });
});
