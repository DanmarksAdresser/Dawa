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

  var scripts = _.map(args, function(arg) {
    return fs.readFileSync(args[0], {encoding: 'utf8'});
  });
  sqlCommon.withWriteTranaction(options.pgConnectionUrl, function(err, client, commit) {
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
          console.log('disabling triggers');
          callback();
        },
        function(callback) {
          client.query("set work_mem='500MB'; set maintenance_work_mem='500MB'", [], callback);
        },
        sqlCommon.disableTriggers(client),
        function(callback) {
          async.eachSeries(scripts, function(script, callback) {
            var commands = script.split(';');
            async.eachSeries(commands, function(command, callback) {
              command = command.trim();
              console.log('executing command %s', command);
              client.query(command, [], callback);
            }, callback);
          }, callback);
        },
        function(callback) {
          console.log('enabling triggers');
          callback();
        },
        sqlCommon.enableTriggers(client)
        ],function(err) {
          exitOnErr(err);
          commit(null, function(err) {
            exitOnErr(err);
          });
        });
      });
    });
});