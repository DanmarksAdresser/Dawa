"use strict";
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {applyCurrentTableToChangeTable} = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('./tableModel');
const {withImportTransaction} = require('../importUtil/transaction-util');
const { derive } = require('@dawadk/import-util/src/table-diff-protocol');

const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    }
  },
  require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);

runConfigured(schema, [], config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    yield withImportTransaction(client, 'migrate_1_30_0', txid => go(function*(){
      for(let table of ['stednavne', 'kommuner','dagi_supplerendebynavne', 'afstemningsomraader', 'menighedsraadsafstemningsomraader', 'regioner', 'politikredse', 'retskredse', 'sogne', 'opstillingskredse', 'storkredse', 'valglandsdele', 'ejerlav', 'jordstykker']) {
        const tableModel = tableSchema.tables[table];
        const tsvColumn = tableModel.columns.find(attr => attr.type === 'tsv');
        yield client.query(`update ${table} set tsv = ${derive(tsvColumn)(table)}`);
        yield applyCurrentTableToChangeTable(client, tableModel, ['tsv']);
      }
    }));
  }));
}));
