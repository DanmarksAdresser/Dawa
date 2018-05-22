"use strict";

const { go } = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const logger = require('../logger').forCategory('updateDawa');
const {withImportTransaction} = require('../importUtil/importUtil');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

runImporter('updateDawa', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });


  return proddb.withTransaction('READ_WRITE', client =>
    withImportTransaction(client, 'updateDawa', (txid) => go(function*() {
      logger.info('Running updateDawa', {txid: txid});
      yield importDarImpl.updateDawa(client, txid);
    })));
});
