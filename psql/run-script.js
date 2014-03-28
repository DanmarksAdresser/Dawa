"use strict";

var cli = require('cli');
var fs = require('fs');
var sqlCommon = require('./common');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
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
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  var script = fs.readFileSync(args[0], {encoding: 'utf8'});
  console.log('executing script\n%s\n', script);
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
      client.query(script, [], function(err) {
        exitOnErr(err);
        commit(null, function(err) {
          exitOnErr(err);
        });
      });
    });
  });
});