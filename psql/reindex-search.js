"use strict";

var async = require('async');

var sqlCommon = require('./common');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

function exitOnErr(err){
  if (err){
    throw new Error(err);
  }
}
cliParameterParsing.main(optionSpec,['pgConnectionUrl'], function(args, options) {
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    async.series([
      sqlCommon.disableTriggers(client),
      sqlCommon.psqlScript(client, __dirname, 'reindex-search.sql'),
      sqlCommon.enableTriggers(client),
      function(callback) {
        commit(null, function(err) {
          callback(err);
        });
      }
    ], function(err) {
      exitOnErr(err);
      console.log('done!');
    });
  });
});