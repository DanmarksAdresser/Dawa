"use strict";

var async = require('async');
var cli = require('cli');
var fs = require('fs');
var sqlCommon = require('./common');
var _ = require('underscore');

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

  var statement = args[0];
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    client.on('error', function(err) {
      exitOnErr(err);
    });
    client.on('notice', function(msg) {
      console.log("notice: %j", msg);
    });
    client.query("SET client_min_messages='INFO'",[], function(err) {
      exitOnErr(err);
      async.series([
        function(callback) {
          client.query("set work_mem='500MB'; set maintenance_work_mem='500MB'", [], callback);
        },
        function(callback) {
          if(options.disableTriggers) {
            console.log('disabling triggers');
            sqlCommon.disableTriggers(client)(callback);
          }
          else {
            console.log('running script with triggers enabled');
            callback();
          }
        },
        function(callback) {
          var commands = statement.split(';');
          async.eachSeries(commands, function(command, callback) {
            command = command.trim();
            console.log('executing statement %s', command);
            client.query(command, [], callback);
          }, callback);
        },
        function(callback) {
          if(options.disableTriggers) {
            console.log('enabling triggers');
            sqlCommon.enableTriggers(client)(callback);
          }
          else {
            callback();
          }
        }
        ],function(err) {
          exitOnErr(err);
          commit(null, function(err) {
            exitOnErr(err);
          });
        });
      });
    });
});