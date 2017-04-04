"use strict";

const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction} = require('../importUtil/importUtil');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med vejmidter', 'string'],
  initial: [false,
    'Sættes til true hvis dette er initiel import. Springer historik-dannelse over.',
    'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, "importHeights", (txid) =>
      importAdresseHeightsImpl.importHeights(client,txid, options.file, options.initial))).done();
});
