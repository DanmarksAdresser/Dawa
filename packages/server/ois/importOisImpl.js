"use strict";

const q = require('q');
const _ = require('underscore');

const { go } = require('ts-csp');
const oisCommon = require('./common');
const oisModels = require('./oisModels');
const oisParser = require('./oisParser');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const tablediff = require('../importUtil/table-diff-legacy');
const logger = require('@dawadk/common/src/logger').forCategory('oisImport');
const {createOisStream, findFilesToImportForEntity, registerOisImport} = require('../ois-common/ois-import');


const oisFileToTable = (client, entityName, dataDir, fileName, table) => go(function* () {
  const columns = oisCommon.postgresColumnNames[entityName];
  const oisStream = yield createOisStream(dataDir, fileName, oisModels[entityName].oisTable,'xml');
  const transformer = oisParser(oisModels[entityName]);
  yield promisingStreamCombiner([oisStream, transformer, ...importUtil.streamToTablePipeline(client, table, columns)]);
});

const findFileName = (filesIndDirectory, entityName) => {
  const matches = _.filter(filesIndDirectory, function (file) {
    return file.toLowerCase().endsWith('zip') &&
      file.toLowerCase().indexOf(oisCommon.oisTableName(entityName).toLowerCase()) !== -1;
  });
  if (matches.length !== 1) {
    throw new Error('Found ' + matches.length + ' files for OIS table ' + oisCommon.oisTableName(entityName));
  }
  return matches[0];
};

const isTableEmpty = (client, table) => q.async(function*() {
  return (yield client.queryp(`SELECT 1 FROM ${table} LIMIT 1`)).rows.length === 0;
})();

const fetchTableName = (entityName) => `fetch_${oisCommon.dawaTableName(entityName)}`;

const createFetchTable = (client, entityName) => {
  const template = oisCommon.dawaTableName(entityName);
  const fetchTable = fetchTableName(entityName);
  const columns = oisCommon.postgresColumnNames[entityName];
  return importUtil.createTempTableFromTemplate(client, fetchTable, template, columns);
};

const clean = (client,entityName) => go(function*() {
  const table = oisCommon.dawaTableName(entityName);
  const oisTable = oisModels[entityName].oisTable;
  yield client.query(`delete from ${table}`);
  yield client.query('delete from ois_importlog where oistable = $1', [oisTable]);
});

function importOis(client, dataDir, singleFileNameOnly, shouldCleanFirst, entityNames) {
  return q.async(function*() {
    entityNames = entityNames ? entityNames : Object.keys(oisModels);
    if(shouldCleanFirst) {
      for(let entityName of entityNames) {
        yield clean(client, entityName);
      }
    }
    const fileDescriptorsMap = {};
    for(let entityName of entityNames) {
      const oisTable = oisModels[entityName].oisTable;
      fileDescriptorsMap[entityName] = yield findFilesToImportForEntity(client, 'bbrt', oisTable, dataDir);
    }
    const filesToImportCount = entityNames.reduce((acc, entityName) => {
      return acc + fileDescriptorsMap[entityName].length;
    }, 0);
    if(!filesToImportCount) {
      throw new Error(`No files to import dataDir=${dataDir}`);
    }
    for (const entityName of entityNames) {
      const fileDescriptors = fileDescriptorsMap[entityName];
      for (let fileDescriptor of fileDescriptors) {
        const fileName = fileDescriptor.fileName;
        if (singleFileNameOnly && fileName !== singleFileNameOnly) {
          continue;
        }
        const existingTableEmpty = yield isTableEmpty(client, oisCommon.dawaTableName(entityName));
        const table = oisCommon.dawaTableName(entityName);
        const delta = !fileDescriptor.total;
        if (existingTableEmpty) {
          if (delta) {
            throw new Error('Kan ikke importere delta-udtræk som initielt udtræk');
          }
          yield oisFileToTable(client, entityName, dataDir, fileName, table);
          logger.info('Importerede Initiel OIS fil', Object.assign({}, fileDescriptor));
        }
        else {
          const keyColumns = oisModels[entityName].key;
          const fetchTable = fetchTableName(entityName);
          yield createFetchTable(client, entityName);
          yield oisFileToTable(client, entityName, dataDir, fileName, fetchTable);
          const postgresColumns = oisCommon.postgresColumnNames[entityName];
          yield tablediff.computeInserts(client, fetchTable, table, `insert_${table}`, keyColumns);
          yield tablediff.computeUpdates(client, fetchTable, table, `update_${table}`, keyColumns, postgresColumns);
          if (!delta) {
            yield tablediff.computeDeletes(client, fetchTable, table, `delete_${table}`, keyColumns);
          }
          yield importUtil.dropTable(client, fetchTable);
          yield tablediff.applyInserts(client, `insert_${table}`, table, postgresColumns, false);
          yield tablediff.applyUpdates(client, `update_${table}`, table, keyColumns, postgresColumns);
          if (!delta) {
            yield tablediff.applyDeletes(client, `delete_${table}`, table, keyColumns);
          }
          let changesSql = `SELECT (select count(*) FROM insert_${table}) as inserts, (select count(*) from update_${table}) as updates`;
          if(!delta) {
            changesSql += `, (select count(*) from delete_${table}) as deletes`;
          }
          const changes = (yield client.queryp(changesSql)).rows[0];
          for (let prefix of ['insert_', 'update_']) {
            yield importUtil.dropTable(client, prefix + table);
          }
          if (!delta) {
            yield importUtil.dropTable(client, `delete_${table}`);
          }
          logger.info('Importerede OIS fil', Object.assign({}, fileDescriptor, changes));
        }
        const oisTable = oisModels[entityName].oisTable;
        yield registerOisImport(client, oisTable, fileDescriptor.serial, !delta);
      }
    }
  })();
}

exports.oisFileToTable = oisFileToTable;
exports.importOis = importOis;
exports.internal = {
  findFileName: findFileName
};
