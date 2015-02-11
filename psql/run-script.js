"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
var runScriptImpl = require('./run-script-impl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  disableTriggers: [false, 'Whether triggers should be disabled when running the scripts', 'boolean']
};



cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function(client) {
    client.on('error', function(err) {
      console.log('error: %j, err');
    });
    client.on('notice', function(msg) {
      console.log("notice: %j", msg);
    });
    return q.nfcall(runScriptImpl,client, args, options.disableTriggers);
  });
});