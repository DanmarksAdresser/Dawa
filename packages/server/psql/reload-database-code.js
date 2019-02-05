"use strict";

var cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
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
    return initialization.reloadDatabaseCode( client, 'psql/schema');
  }).done();
});
