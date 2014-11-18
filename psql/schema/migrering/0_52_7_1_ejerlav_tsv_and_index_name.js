"use strict";

var runSql = require('../../run-sql-statement-impl');
var cli = require('cli');
var cliParameterParsing = require('../../../bbr/common/cliParameterParsing');
var sqlCommon = require('../../common');
var _ = require('underscore');
var async = require('async');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};
cli.parse(optionSpec, []);

function exitOnErr(err) {
  if (err) {
    console.log("Error: %j", err, {});
    process.exit(1);
  }
}

cli.main(function(args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  console.log("pgConnectionUrl: %s", options.pgConnectionUrl);

  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    async.series([
      sqlCommon.disableTriggers(client),
      sqlCommon.psqlScript(client, __dirname, '0_52_7_1_ejerlav_tsv_and_index_name.sql'),
      sqlCommon.psqlScript(client, __dirname + "/..", 'ejerlav.sql'),
      sqlCommon.enableTriggers(client),
      function(callback) {
        commit(null, function(err) {
          callback(err);
        });
      }
    ], function(err) {
      exitOnErr(err);
    });
  });

  runSql("select ejerlav_init()", options.pgConnectionUrl, true, exitOnErr);

  console.log('done');
});