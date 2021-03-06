const { go } = require('ts-csp');
const { findFilesToImportForEntity, createOisStream , registerOisImport} = require('../../ois-common/ois-import');
const { streamToTablePipeline } = require('@dawadk/import-util/src/postgres-streaming');
const {computeDifferences, applyChanges, computeDifferencesSubset } = require('@dawadk/import-util/src/table-diff');
const allImportModels = require('../../ois2/import-models');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const logger = require('@dawadk/common/src/logger').forCategory('grbbrImport');
const {advanceVirkningTime} = require('@dawadk/import-util/src/current-util');
const importOisFile = (client, txid, dataDir, fileDescriptor, oisImportSpec, fetchTableName, tmpFetchTable) => go(function*() {
  // we cannot just stream directly into fetch table because multiple files may result in duplicate keys.
  const { fileName, format } = fileDescriptor;
  logger.info(`Streaming OIS file to database`, {file: fileName, format});
  const oisXmlStream = yield createOisStream(dataDir, fileName, oisImportSpec.oisTable, format);
  const {tableModel, mapFn } = oisImportSpec;
  const columnNames = tableModel.columns.map(column => column.name);
  const streams = [
    oisXmlStream,
    ...streamToTablePipeline(client, tmpFetchTable, columnNames, mapFn)
  ];
  yield promisingStreamCombiner(streams);
  yield client.query(`DELETE FROM ${fetchTableName} USING ${tmpFetchTable} WHERE ${fetchTableName}.rowkey = ${tmpFetchTable}.rowkey`)
  yield client.query(`INSERT INTO ${fetchTableName} (SELECT * from ${tmpFetchTable})`);
  yield client.query(`TRUNCATE ${tmpFetchTable}`);
  yield registerOisImport(client, fileDescriptor.oisTable, fileDescriptor.serial, fileDescriptor.total);
});

const doImport = (client, txid, dataDir, oisImportSpec) => go(function*() {
  const {oisTable, oisRegister } = oisImportSpec;
  const filesToImport =  yield findFilesToImportForEntity(client, oisRegister, oisTable, dataDir);
  const isTotal = filesToImport.some(descriptor => descriptor.total);
  const {tableModel } = oisImportSpec;
  const fetchTableName = `fetch_${tableModel.table}`;
  yield client.query(`CREATE TEMP TABLE ${fetchTableName} AS (select * from ${tableModel.table} where false)`);
  yield client.query(`ALTER TABLE ${fetchTableName} ADD PRIMARY KEY (rowkey)`);
  const tmpFetchTable = `tmp_${fetchTableName}`;
  yield client.query(`CREATE TEMP TABLE ${tmpFetchTable} AS (select * from ${fetchTableName} where false)`);
  for(let fileDescriptor of filesToImport) {
    yield importOisFile(client, txid, dataDir, fileDescriptor, oisImportSpec, fetchTableName, tmpFetchTable);
  }
  yield client.query(`DROP TABLE ${tmpFetchTable}`);
  if(isTotal) {
    yield computeDifferences(client, txid, fetchTableName, tableModel);
  }
  else {
    const dirtyTableName = `dirty_${tableModel.table}`;
    yield client.query(`CREATE TEMP TABLE ${dirtyTableName} AS (select ${tableModel.primaryKey.join(',')} FROM ${fetchTableName})`);
    yield computeDifferencesSubset(client, txid, fetchTableName, dirtyTableName, tableModel);
    yield client.query(`DROP TABLE ${dirtyTableName}`);
  }
  yield client.query(`DROP TABLE ${fetchTableName}`);
  yield applyChanges(client, txid, tableModel);
});

module.exports = ({dataDir, entityNames}) => {
  entityNames = entityNames || allImportModels.map(importModel => importModel.name);
  const importedModels = allImportModels.filter(model => entityNames.includes(model.name));
  const execute = (client, txid, strategy, context) => go(function*() {
    for(let importModel of importedModels) {
      yield doImport(client, txid, dataDir, importModel);
    }
    yield advanceVirkningTime(client, txid, 'grbbr_virkning_ts', allImportModels.map(model => model.tableModel));
  });
  return {
    id: 'OIS-Bitemporal-Import',
    description: 'OIS Bitemporal Importer',
    execute,
    produces: importedModels.map(importModel => importModel.tableModel.table),
    requires: []
  };
};