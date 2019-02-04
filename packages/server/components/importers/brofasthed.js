const { go } = require('ts-csp');

const {streamCsvToTable} = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('../../psql/tableModel');

const importBrofasthed = (client, txid, filePath) => go(function*() {
  yield client.query('create temp table fetch_brofasthed as (select * from brofasthed where false)');
  yield streamCsvToTable(client, filePath, 'fetch_brofasthed', ['stedid', 'brofast']);
  yield tableDiffNg.computeDifferences(client, txid, `fetch_brofasthed`, tableSchema.tables.brofasthed);
  yield tableDiffNg.applyChanges(client, txid, tableSchema.tables.brofasthed);
  yield client.query('drop table fetch_brofasthed');
});

const createBrofasthedImporter = ({filePath}) => {
  return {
    requires: [],
    produces: ['brofasthed'],
    execute: (client, txid) => importBrofasthed(client, txid, filePath)
  };
};

module.exports = { createBrofasthedImporter };