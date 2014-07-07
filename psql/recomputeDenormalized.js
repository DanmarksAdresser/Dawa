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
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    if(err) {
      exitOnErr(err);
    }
    initialization.disableTriggersAndInitializeTables(client)(function(err) {
      if(err) {
        exitOnErr(err);
      }
      commit(null, function(err) {
        if(err) {
          exitOnErr(err);
        }
        console.log('Recompute denormalized completed');
      });
    });
  });
});
