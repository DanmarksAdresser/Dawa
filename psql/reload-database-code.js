"use strict";

var cli = require('cli');
var winston  = require('winston');
var _        = require('underscore');
var async    = require('async');
var sqlCommon = require('./common');
var initialization = require('./initialization');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cli.parse(optionSpec, []);

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

cli.main(function(args, options) {
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    initialization.reloadDatabaseCode(client, 'psql/schema')(function(err) {
      exitOnErr(err);
      commit(function(err) {
        exitOnErr(err);
      });
    });
  });
});