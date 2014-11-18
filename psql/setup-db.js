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

var exitOnErr = sqlCommon.exitOnErr;

cli.main(function(args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  var scriptDir = __dirname + '/schema';
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, callback) {
    if(err) {
      exitOnErr(err);
    }
    async.series(
      [
        initialization.loadSchemas(client, scriptDir),
        initialization.disableTriggersAndInitializeTables(client),
        function(cb) {console.log('Main is done!'); cb(); }
      ],
      function(err){
        if(err) {
          exitOnErr(err);
        }
        callback(null, function(err) {
          if(err) {
            exitOnErr(err);
          }
        });
      });
  });

});
