"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importDar09Impl = require('../darImport/importDarImpl');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', q.async(function*(client) {
    try {
      yield importDar09Impl.clearDawa(client);
      yield importDarImpl.initDawa(client);
    }
    catch(err) {
      logger.error('Caught error in initDawa', err);
      throw err;
    }
  })).done();
});
