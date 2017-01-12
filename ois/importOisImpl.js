"use strict";

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

const oisCommon = require('./common');
const oisModels = require('./oisModels');
var oisParser = require('./oisParser');
const importUtil = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const tablediff = require('../importUtil/tablediff');
const logger = require('../logger').forCategory('oisImport');

const OIS_FILE_REGEX = /^ois_nybbr_(co\d+t)_(na|da|te)000_(\d+)_(\d+)_(\d+).zip$/;


function createUnzippedStream(filePath, filePattern) {
  var args = [ 'e', '-so', path.resolve(filePath) , filePattern];
  var proc = child_process.spawn( '7za', args);
  return proc.stdout;
}

function createOisStream(entityName, dataDir, fileName) {
  const model = oisModels[entityName];
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const stream = createUnzippedStream(path.join(dataDir, fileName), xmlFileName);
  return oisParser.oisStream(stream, model);
}

function oisFileToTable(client, entityName, dataDir, fileName, table) {
  return q.async(function*() {
    const columns = oisCommon.postgresColumnNames[entityName];
    const oisStream = yield createOisStream(entityName, dataDir, fileName);
    yield promisingStreamCombiner([oisStream].concat(importUtil.streamToTablePipeline(client, table, columns)));
  })();
}

const fileNameToDescriptor = fileName => {
  const match = OIS_FILE_REGEX.exec(fileName);
  if(!match) {
    throw new Error(`Filename ${fileName} did not match regex`);
  }
  const oisTable = match[1];
  const total = match[2] !== 'da';
  const serial = parseInt(match[3], 10);
  return {
    oisTable: oisTable,
    total: total,
    serial: serial,
    fileName: fileName
  };
};

const getAlreadyImportedSerials = (client, entityName, serials) => {
  return q.async(function*() {
    const serialParams = [];
    for(let i = 2; i <= serials.length + 1; ++i) {
      serialParams.push(`$${i}`);
    }
    const alreadyImportedSerialsSql = `SELECT serial FROM ois_importlog WHERE entity = $1 AND serial IN (${serialParams.join(', ')})`;
    return (yield client.queryp(alreadyImportedSerialsSql, [entityName].concat(serials))).rows.map(row => row.serial);
  })();
};

const findFilesToImportForEntity = (client, oisModelName, dataDir) => {
  return q.async(function*() {
    const oisModel = oisModels[oisModelName];
    const files = yield q.nfcall(fs.readdir, dataDir);
    const descriptors = files.map(fileNameToDescriptor);
    const oisTable = oisModel.oisTable;
    const descriptorsForEntity = descriptors.filter(descriptor => descriptor.oisTable.toLowerCase() === oisTable.toLowerCase());
    if(descriptorsForEntity.length  === 0) {
      return [];
    }
    const serialToFileMap = _.groupBy(descriptorsForEntity, 'serial');
    for(let serialStr of Object.keys(serialToFileMap)) {
      if(serialToFileMap[serialStr].length > 1) {
        throw new Error('Duplicate serial');
      }
    }
    const serials = Object.keys(serialToFileMap).map(serial => parseInt(serial, 10));
    const alreadyImportedSerials = yield getAlreadyImportedSerials(client, oisModelName, serials);
    const serialsToImport = _.difference(serials, alreadyImportedSerials);
    serialsToImport.sort((a, b) => a - b);
    return serialsToImport.map(serial => serialToFileMap[serial][0]);
  })();
};

const findFileName = (filesIndDirectory, entityName) => {
  const matches = _.filter(filesIndDirectory, function(file) {
    return file.toLowerCase().endsWith('zip') &&
    file.toLowerCase().indexOf(oisCommon.oisTableName(entityName).toLowerCase()) !== -1;
  });
  if(matches.length !== 1) {
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

function importOis(client, dataDir, singleFileNameOnly) {
  return q.async(function*() {
    for(const entityName of Object.keys(oisModels)) {
      const fileDescriptors = yield findFilesToImportForEntity(client, entityName, dataDir);
      for(let fileDescriptor of fileDescriptors) {
        const fileName = fileDescriptor.fileName;
        if(singleFileNameOnly && fileName !== singleFileNameOnly) {
          continue;
        }
        const existingTableEmpty = yield isTableEmpty(client, oisCommon.dawaTableName(entityName));
        const filePath = path.join(dataDir, fileName);
        const table = oisCommon.dawaTableName(entityName);
        const delta = !fileDescriptor.total;
        logger.info('Importerer OIS fil', fileDescriptor);
        if(existingTableEmpty) {
          if(delta) {
            throw new Error('Kan ikke importere delta-udtræk som initielt udtræk');
          }
          yield oisFileToTable(client, entityName, dataDir, fileName, table);
        }
        else {
          const keyColumns = oisModels[entityName].key;
          const fetchTable = fetchTableName(entityName);
          yield createFetchTable(client, entityName);
          yield oisFileToTable(client, entityName, filePath, fetchTable);
          const postgresColumns = oisCommon.postgresColumnNames[entityName];
          yield tablediff.computeInserts(client, fetchTable, table, `insert_${table}`, keyColumns);
          yield tablediff.computeUpdates(client, fetchTable, table, `update_${table}`, keyColumns, postgresColumns);
          if(!delta) {
            yield tablediff.computeDeletes(client, fetchTable, table, `delete_${table}`, keyColumns);
          }
          yield importUtil.dropTable(client, fetchTable);
          yield tablediff.applyInserts(client, `insert_${table}`, table, postgresColumns, false);
          yield tablediff.applyUpdates(client, `update_${table}`, table, keyColumns, postgresColumns);
          if(!delta) {
            yield tablediff.applyDeletes(client, `delete_${table}`, table, keyColumns);
          }
          for(let prefix of ['insert_', 'update_']) {
            yield importUtil.dropTable(client, prefix + table);
          }
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
  createOisStream: createOisStream,
  createUnzippedStream: createUnzippedStream,
  findFileName: findFileName
};
