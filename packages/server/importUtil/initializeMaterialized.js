"use strict";

// This script loads postnumre into the database from a CSV-file.

const { go } = require('ts-csp');
const _         = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const databasePools = require('../psql/databasePools');
const { withImportTransaction } = require('./importUtil');
const schemaModel = require('../psql/tableModel');
const tableDiffNg = require('./tableDiffNg');
const sqlCommon = require('../psql/common');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  tables: [false, 'Comma-separated list of materialized tables to (re)initialize', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  const tables = options.tables.split(',');
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  databasePools.get('prod').withConnection({pooled: false}, (client) => {
      return withImportTransaction(client, 'initializeMaterialized', (txid) => go(function*() {
        for(let table of tables) {
          const model = schemaModel.materializations[table];
          if(!model) {
            throw new Error('No table model for ' + schemaModel);
          }
          yield sqlCommon.disableTriggersQ(client);
          yield client.query(`delete from ${table}; delete from ${table}_changes`);
          yield tableDiffNg.initializeFromScratch(client, txid, model.view, schemaModel.tables[table]);
          yield sqlCommon.enableTriggersQ(client);
        }
      }));
    }
  ).asPromise().done();
});
