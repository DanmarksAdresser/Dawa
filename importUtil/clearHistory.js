"use strict";

// This script loads postnumre into the database from a CSV-file.

const { go } = require('ts-csp');
const _         = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const databasePools = require('../psql/databasePools');
const { withImportTransaction } = require('./importUtil');
const tableModels = require('../psql/tableModel');
const { clearHistory } = require('./tableDiffNg');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  tables: [false, 'Comma-separated list of tables to migrate', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  const tables = options.tables.split(',');
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  databasePools.get('prod').withConnection({pooled: false}, (client) => {
      return withImportTransaction(client, 'clearHistory', (txid) => go(function*() {
        for(let table of tables) {
          const tableModel = tableModels.tables[table];
          yield clearHistory(client, txid, tableModel);
        }
      }));
    }
  ).asPromise().done();
});
