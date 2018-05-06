"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const proddb = require('../psql/proddb');
const inspect = require('./inspectImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  txid: [false, 'Transaktions-id', 'number'],
  tableName: [false, 'Inspicer enkelt tabel', 'string'],
  columnName: [false, 'Inspicer enkelt kolonne i tabel', 'string'],
  aggregate: [false, 'Aggreger ændringer', 'boolean', false]
};

runImporter('stednavne', optionSpec, _.without(_.keys(optionSpec), 'tableName', 'columnName'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_ONLY', client => go(function*() {
    /* eslint no-console: 0 */
    console.log(JSON.stringify(yield inspect(client, options.txid, options.tableName, options.columnName, options.aggregate), null, 2));
  }));
});
