"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const { withImportTransaction} = require('../importUtil/importUtil');
const importStednavneImpl = require('./importStednavneImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med bebyggelser', 'string'],
  initial: [false,
    'Sættes til true hvis dette er initiel import.',
    'boolean', false],
  skipsanitycheck: [false, 'Spring over sanity check af import', 'boolean', false]
};

runImporter('stednavne', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importStednavne', txid => importStednavneImpl.importStednavne(client, txid, options.file));
  }));
});
