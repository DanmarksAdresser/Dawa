"use strict";

// This script loads ejerlav into the database from a CSV-file.

var _         = require('underscore');

const databasePools = require('./databasePools');
const { withImportTransaction } = require('../importUtil/importUtil');
var proddb = require('./proddb');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var logger = require('../logger');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  var inputFile = args[0];
  databasePools.get('prod').withConnection({pooled: false}, (client) => {
      return withImportTransaction(client, 'updateEjerlav', (txid) => {
        return updateEjerlavImpl(client, txid, inputFile);
      })
  }
  ).asPromise().done();
});
