const { go } = require('ts-csp');
const { findFilesToImportForEntity, createOisStream } = require('../../ois-common/ois-import');
const { streamToTablePipeline } = require('@dawadk/import-util/src/postgres-streaming');
const  { pipeline } = require('stream');
const {computeDifferences, applyChanges } = require('@dawadk/import-util/src/table-diff');
const Promise = require('bluebird');
const {oisImportSpecs} = require('../../ois2/model');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');

const importOisFile = (client, txid, dataDir, fileDescriptor, oisImportSpec) => go(function*() {
  const {tableModel, mapFn } = oisImportSpec;
  const fetchTableName = `fetch_${tableModel.table}`;
  yield client.query(`CREATE TEMP TABLE ${fetchTableName} AS (select * from ${tableModel.table} where false)`);
  const { fileName, total } = fileDescriptor;
  const oisXmlStream = yield createOisStream(dataDir, fileName, oisImportSpec.oisTable);
  const columnNames = tableModel.columns.map(column => column.name);
  const streams = [
    oisXmlStream,
    ...streamToTablePipeline(client, fetchTableName, columnNames, mapFn)
  ];
  yield promisingStreamCombiner(streams);
  if(total) {
    yield computeDifferences(client, txid, fetchTableName, tableModel);
    yield applyChanges(client, txid, tableModel);
  }

});

const doImport = (client, txid, dataDir, oisImportSpec) => go(function*() {
  const {oisTable, oisRegister } = oisImportSpec;
  const filesToImport =  yield findFilesToImportForEntity(client, oisRegister, oisTable, dataDir);
  for(let fileDescriptor of filesToImport) {
    console.log('importing ' + fileDescriptor.fileName);
    yield importOisFile(client, txid, dataDir, fileDescriptor, oisImportSpec);
  }
});

module.exports = ({dataDir}) => {
  const execute = (client, txid, strategy, context) => go(function*() {
    for(let oisImportSpec of oisImportSpecs) {
      yield doImport(client, txid, dataDir, oisImportSpec);
    }
  });
  return {
    id: 'OIS-Bitemporal-Import',
    description: 'OIS Bitemporal Importer',
    execute,
    produces: oisImportSpecs.map(importSpec => importSpec.tableModel.table),
    requires: []
  };
};