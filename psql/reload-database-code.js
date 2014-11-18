"use strict";

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var winston  = require('winston');
var sqlCommon = require('./common');
var initialization = require('./initialization');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

var exitOnErr = sqlCommon.exitOnErr;

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  console.log(options.pgConnectionUrl);
  console.log(JSON.stringify(options));
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    initialization.reloadDatabaseCode(client, 'psql/schema')(function(err) {
      exitOnErr(err);
      commit(null, function(err) {
        exitOnErr(err);
      });
    });
  });
});