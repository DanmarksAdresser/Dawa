"use strict";

// This script loads postnumre into the database from a CSV-file.

const { go } = require('ts-csp');
const _         = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const databasePools = require('../psql/databasePools');
const tableModel = require('../psql/tableModel');
const { migrateHistoryToChangeTable } = require('./tableDiffNg');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  databasePools.get('prod').withConnection({pooled: false}, (client) => go(function*() {
    yield client.query('DELETE FROM vejstykker_changes where txid=1;' +
      'DELETE FROM adgangsadresser_changes where txid=1;' +
      'DELETE FROM enhedsadresser_changes where txid=1;');
    for(let table of ['vejstykker', 'adgangsadresser', 'enhedsadresser']) {
      const model = tableModel.tables[table];
      if(!model) {
        throw new Error('No table model for ' + tableModel);
      }
      yield migrateHistoryToChangeTable(client, 1, model);
    }
  })).asPromise().done();
});
