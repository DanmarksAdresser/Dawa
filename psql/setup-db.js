"use strict";

var cli = require('cli');
var Q = require('q');
var _        = require('underscore');
var async    = require('async');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var initialization = require('./initialization');
var proddb = require('./proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cli.parse(optionSpec, []);

cli.main(function (args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var scriptDir = __dirname + '/schema';
  proddb.withTransaction('READ_WRITE', function (client) {
    return Q.nfcall(async.series,
      [
        initialization.loadSchemas(client, scriptDir),
        initialization.disableTriggersAndInitializeTables(client),
      ]);
  }).done();
});
