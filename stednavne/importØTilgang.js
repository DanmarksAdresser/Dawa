"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const { withImportTransaction} = require('../importUtil/importUtil');
const importØTilgangImpl = require('./importØTilgangImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med Øtilgange', 'string', 'data/øtilgang.csv']
};

runImporter('øtilgang', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importØTilgang', txid => importØTilgangImpl(client, txid, options.file));
  }));
});
