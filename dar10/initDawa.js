"use strict";

const { go } = require('ts-csp');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importDar09Impl = require('../darImport/importDarImpl');
var importDarImpl = require('./importDarImpl');
var proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'initDawa', (txid) => go(function*() {
      yield importDar09Impl.clearDawa(client);
      yield importDarImpl.initDawa(client, txid);
    }));
  })).done();

});
