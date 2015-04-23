"use strict";

var async = require('async');
var q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
var sqlCommon = require('./common');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec,['pgConnectionUrl'], function(args, options) {
  proddb.init({ connString: options.pgConnectionUrl, pooled: false});
  proddb.withTransaction('READ_WRITE', function(client) {
    return sqlCommon.reindex(client);
  }).done();
});