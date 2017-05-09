"use strict";

/*eslint no-console: 0 */

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
var runScriptImpl = require('./run-script-impl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
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
    return runScriptImpl(client, args);
  }).done();
});
