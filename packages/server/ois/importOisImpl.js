"use strict";

const fs = require('fs');
const path = require('path');
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
const {fileNameToDescriptor, getLastImportedSerial, getOisFileRegex} = require('../ois-common/ois-import');


const createOisStream = (entityName, dataDir, fileName) => go(function*() {
  const model = oisModels[entityName];
  return oisParser.oisStream(stream, model);
});

function oisFileToTable(client, entityName, dataDir, fileName, table) {
  return q.async(function*() {
    const columns = oisCommon.postgresColumnNames[entityName];
    const oisStream = yield createOisStream(entityName, dataDir, fileName);
    yield promisingStreamCombiner([oisStream].concat(importUtil.streamToTablePipeline(client, table, columns)));
    const streams = streamToTablePipeline()
  })();
}

const bbrtFilenameToDescriptor = fileName => {
  return fileNameToDescriptor('bbrt', fileName);
};

const getLastImportedSerialForEntity = (client, entityName) => {
  const oisTable = oisModels[entityName].oisTable;
  return getLastImportedSerial(client, oisTable);
};

const findFilesToImportForEntity = (client, oisModelName, dataDir) => {
  return q.async(function*() {
    const oisModel = oisModels[oisModelName];
    const filesAndDirectories = yield q.nfcall(fs.readdir, dataDir);
    const files = [];
    for (let fileOrDirectory of filesAndDirectories) {
      const stat = yield q.nfcall(fs.stat, path.join(dataDir, fileOrDirectory));
      if (!stat.isDirectory()) {
        files.push(fileOrDirectory);
      }
    }
    const oisFileRegex = getOisFileRegex('bbrt');
    const oisFiles = files.filter(file => oisFileRegex.test(file));
    const descriptors = oisFiles.map(bbrtFilenameToDescriptor);
    const oisTable = oisModel.oisTable;
    const descriptorsForEntity = descriptors.filter(descriptor => descriptor.oisTable.toLowerCase() === oisTable.toLowerCase());
    if (descriptorsForEntity.length === 0) {
      return [];
    }
    const serialToFileMap = _.groupBy(descriptorsForEntity, 'serial');
    for (let serialStr of Object.keys(serialToFileMap)) {
      if (serialToFileMap[serialStr].length > 1) {
        logger.error('Duplicate Serial', {
          serial: serialStr,
          files: serialToFileMap[serialStr]
        });
        throw new Error('Duplicate serial');
      }
    }
    const serials = Object.keys(serialToFileMap).map(serial => parseInt(serial, 10));
    const lastImportedSerial = yield getLastImportedSerialForEntity(client, oisModelName);
    const lastTotalSerial = _.max(descriptors.filter(descriptor => descriptor.total).map(descriptor => descriptor.serial));
    const firstSerialToImport = Math.max(lastImportedSerial+1, lastTotalSerial);
    const serialsToImport = serials.filter(serial => serial >= firstSerialToImport);
    serialsToImport.sort((a, b) => a - b);
    if(serialsToImport.length === 0) {
      return [];
    }
    const firstImportedSerial = serialsToImport[0];
    if (firstImportedSerial !== firstSerialToImport) {
      logger.error('Missing serial', {
        entity: oisModelName,
        serial: lastImportedSerial + 1
      });
      throw new Error('Missing serial');
    }
    for (let i = 0; i < serialsToImport.length - 2; ++i) {
      if (serialsToImport[i] + 1 !== serialsToImport[i + 1]) {
        logger.error('Missing serial', {
          entity: oisModelName,
          serial: serialsToImport[i] + 1
        });
        throw new Error('Missing serial');
      }
    }
    return serialsToImport.map(serial => serialToFileMap[serial][0]);
  })();
};

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
  yield client.query(`delete from ${table}`);
  yield client.query('delete from ois_importlog where entity = $1', [entityName]);
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
      fileDescriptorsMap[entityName] = yield findFilesToImportForEntity(client, entityName, dataDir);
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
        yield client.queryp('INSERT INTO ois_importlog(entity, serial, total, ts) VALUES ($1, $2, $3, NOW())',
          [entityName, fileDescriptor.serial, !delta]);
      }
    }
  })();
}

exports.oisFileToTable = oisFileToTable;
exports.importOis = importOis;
exports.internal = {
  findFileName: findFileName
};
