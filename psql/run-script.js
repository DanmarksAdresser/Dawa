"use strict";

var cli = require('cli');
var sqlCommon = require('./common');
var _ = require('underscore');

var runScriptImpl = require('./run-script-impl');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  disableTriggers: [false, 'Whether triggers should be disabled when running the scripts', 'boolean']
};

cli.parse(optionSpec, []);

function exitOnErr(err){
  if (err){
    console.log("Error: %j", err, {});
    process.exit(1);
  }
}

cli.main(function(args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  cliParameterParsing.checkRequiredOptions(options, _.without(_.keys(optionSpec), 'disableTriggers'));

  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    runScriptImpl(client, args, options.disableTriggers, function(err) {
      exitOnErr(err);
      commit(null, function(err) {
        exitOnErr(err);
      });
    });
    client.on('error', function(err) {
      exitOnErr(err);
    });
    client.on('notice', function(msg) {
      console.log("notice: %j", msg);
    });
    });
});