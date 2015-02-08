"use strict";

var cli = require('cli');
var Q = require('q');
var _        = require('underscore');
var async    = require('async');
var transactions = require('./transactions');
var initialization = require('./initialization');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cli.parse(optionSpec, []);

cli.main(function (args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  var scriptDir = __dirname + '/schema';
  transactions.withTransaction( {
    connString: options.pgConnectionUrl,
    pooled: false,
    mode: 'READ_WRITE'
  }, function (client) {
    return Q.nfcall(async.series,
      [
        initialization.loadSchemas(client, scriptDir),
        initialization.disableTriggersAndInitializeTables(client)
      ]);
  }).done();
});
