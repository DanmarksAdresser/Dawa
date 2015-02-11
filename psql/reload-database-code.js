"use strict";

var q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var initialization = require('./initialization');
var proddb = require('./proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', function(client) {
    return q.nfcall(initialization.reloadDatabaseCode, client, 'psql/schema');
  }).done();
});