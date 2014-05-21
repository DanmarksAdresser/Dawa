"use strict";

var cli = require('cli');
var winston  = require('winston');
var _        = require('underscore');
var async    = require('async');
var sqlCommon = require('./common');

var initializeTables = sqlCommon.initializeTables;
var psqlScript = sqlCommon.psqlScript;

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cli.parse(optionSpec, []);




function loadSchemas(client, scriptDir){
  return function(done){
    sqlCommon.forAllTableSpecs(client,
      function (client, spec, cb){
        console.log("loading script " + spec.scriptFile);
        return (psqlScript(client, scriptDir, spec.scriptFile))(cb);
      },
      done);
  };
}

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

  var scriptDir = __dirname + '/schema';
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, callback) {
    if(err) {
      exitOnErr(err);
    }
    async.series(
      [
        psqlScript(client, scriptDir, 'misc.sql'),
        loadSchemas(client, scriptDir),
        psqlScript(client, scriptDir, 'geoserver_views.sql'),
        sqlCommon.disableTriggers(client),
        initializeTables(client),
        sqlCommon.enableTriggers(client),
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
