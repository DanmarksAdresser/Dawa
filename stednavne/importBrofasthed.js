"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const { withImportTransaction} = require('../importUtil/importUtil');
const importBrofasthedImpl = require('./importBrofasthedImpl');
const proddb = require('../psql/proddb');
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med angivelse af brofasthed', 'string', 'data/brofasthed.csv'],
  init: [false, 'Initiel import', 'boolean', false]
};

runImporter('brofasthed', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importBrofasthed', txid => go(function*() {
      yield importBrofasthedImpl(client, txid, options.file, options.init);

    }));
  }));
});
