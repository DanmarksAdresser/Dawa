"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const proddb = require('../psql/proddb');
const inspect = require('./inspectImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  txid: [false, 'Transaktions-id', 'number']
};

runImporter('stednavne', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_ONLY', client => go(function*() {
    /* eslint no-console: 0 */
    console.log(JSON.stringify(yield inspect(client, options.txid, true), null, 2));
  }));
});
