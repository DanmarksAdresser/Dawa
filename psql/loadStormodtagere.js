"use strict";

// Loading large-mail-recievers (stormodtagere)
// ============================================
//
// This script will re-load all large-mail-recievers into a given
// database.
//
const _         = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const loadStormodtagereImpl = require('./loadStormodtagereImpl');
const proddb = require('./proddb');
const { withImportTransaction } = require('../importUtil/importUtil');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  const inputFile = args[0];

  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function(client){
    return withImportTransaction(client, 'updateStormodtagere', (txid) => {
      return loadStormodtagereImpl(client, txid, inputFile);
    })
  }).done();
});
