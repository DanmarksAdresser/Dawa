"use strict";

var cli = require('cli');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var run_sql_statement = require('./run-sql-statement-impl.js');
var _ = require('underscore');

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

  var statement = args[0];
  run_sql_statement(statement, options.pgConnectionUrl, options.disableTriggers, exitOnErr);
});