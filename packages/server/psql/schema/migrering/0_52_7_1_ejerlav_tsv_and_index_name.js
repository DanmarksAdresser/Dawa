"use strict";

var cliParameterParsing = require('../../../bbr/common/cliParameterParsing');
var sqlCommon = require('../../common');
var async = require('async');
var winston = require('winston');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

var exitOnErr = sqlCommon.exitOnErr;

cliParameterParsing.mainMandatory(optionSpec, function(args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  winston.info("pgConnectionUrl: %s", options.pgConnectionUrl);

  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    async.series([
        sqlCommon.disableTriggers(client),
        sqlCommon.psqlScript(client, __dirname, '0_52_7_1_ejerlav_tsv_and_index_name.sql'),
        sqlCommon.psqlScript(client, __dirname + "/..", 'ejerlav.sql'),
        function(callback) {
          sqlCommon.execSQL("select ejerlav_init()", client, true, callback);
        },
        sqlCommon.enableTriggers(client),
        function(callback) {
          commit(null, function(err) {
            callback(err);
          });
        },
        function(callback) {
          winston.info('Migration done');
          callback();
        }
      ],
      exitOnErr);
  });
});
