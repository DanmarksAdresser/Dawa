"use strict";

// This script loads postnumre into the database from a CSV-file.

const { go } = require('ts-csp');
var _         = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('../psql/proddb');
const databasePools = require('../psql/databasePools');
const { withImportTransaction } = require('../importUtil/importUtil');
var updateVejpunkterImpl = require('./importVejpunkterImpl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  databasePools.get('prod').withConnection({pooled: false}, (client) => {
      return withImportTransaction(client, 'updateVejpunkter', (txid) => go(function*() {
        yield updateVejpunkterImpl(client, txid, inputFile);
      }));
    }
  ).asPromise().done();
});
