"use strict";

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const q = require('q');
const _ = require('underscore');
const Promise = require('bluebird');

const { go } = require('ts-csp');
const oisCommon = require('./common');
const oisModels = require('./oisModels');
const oisParser = require('./oisParser');
const importUtil = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const tablediff = require('../importUtil/tablediff');
const logger = require('../logger').forCategory('oisImport');
const tmp = require('tmp');

const OIS_FILE_REGEX = /^ois_bbrt_(co\d+t)_(na|da|te)000_(\d+)_(\d+)_(\d+).zip$/i;


function createUnzippedStream(filePath, filePattern) {
  var args = ['e', '-so', path.resolve(filePath), filePattern];
  var proc = child_process.spawn('7za', args);
  return proc.stdout;
}

function unzipToTempFile(filePath, filePattern) {
  const tmpFile = tmp.fileSync();
  const out = fs.createWriteStream(tmpFile.name);
  var args = ['e', '-so', path.resolve(filePath), filePattern];
  var proc = child_process.spawn('7za', args);
  proc.stdout.pipe(out);
  return new Promise(resolve => {
    out.on('finish', () => resolve(tmpFile));
  })
}



function createOisStream(entityName, dataDir, fileName) {
  const model = oisModels[entityName];
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const stream = createUnzippedStream(path.join(dataDir, fileName), xmlFileName);
  return oisParser.oisStream(stream, model);
}

const createOisStreamTmp = (entityName, dataDir, fileName) => go(function*() {
  const model = oisModels[entityName];
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const tmpFile = yield unzipToTempFile(path.join(dataDir, fileName), xmlFileName);
  const stream = fs.createReadStream(tmpFile.name);
  stream.on('end', () => tmpFile.removeCallback());
  return oisParser.oisStream(stream, model);
});

function oisFileToTable(client, entityName, dataDir, fileName, table) {
  return q.async(function*() {
    const columns = oisCommon.postgresColumnNames[entityName];
    const oisStream = yield createOisStreamTmp(entityName, dataDir, fileName);
    yield promisingStreamCombiner([oisStream].concat(importUtil.streamToTablePipeline(client, table, columns)));
  })();
}

const fileNameToDescriptor = fileName => {
  const match = OIS_FILE_REGEX.exec(fileName);
  if (!match) {
    throw new Error(`Filename ${fileName} did not match regex`);
  }
  const oisTable = match[1].toLowerCase();
  const total = match[2].toLowerCase() !== 'da';
  const serial = parseInt(match[3], 10);
  return {
    oisTable: oisTable,
    total: total,
    serial: serial,
    fileName: fileName,
    fileDate: match[4],
    fileTime: match[5]
  };
};

const getLastImportedSerial = (client, entityName) => q.async(function*() {
  const alreadyImportedSerialsSql = `SELECT max(serial) as serial FROM ois_importlog WHERE entity = $1`;
  return (yield client.queryp(alreadyImportedSerialsSql, [entityName])).rows[0].serial;
})();

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
    const oisFiles = files.filter(file => OIS_FILE_REGEX.test(file));
    const descriptors = oisFiles.map(fileNameToDescriptor);
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
    const lastImportedSerial = yield getLastImportedSerial(client, oisModelName);
    const lastTotalSerial = _.max(descriptors.filter(descriptor => descriptor.total).map(descriptor => descriptor.serial));
    const firstSerialToImport = Math.max(lastImportedSerial+1, lastTotalSerial);
    const serialsToImport = serials.filter(serial => serial >= firstSerialToImport);
    serialsToImport.sort((a, b) => a - b);
    if(serialsToImport.length === 0) {
      return [];
    }
    if (lastImportedSerial + 1 !== firstSerialToImport && firstSerialToImport !== lastTotalSerial) {
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
    for (const entityName of entityNames) {
      if(shouldCleanFirst) {
        yield clean(client, entityName);
      }
      const fileDescriptors = yield findFilesToImportForEntity(client, entityName, dataDir);
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
  createOisStream: createOisStream,
  createUnzippedStream: createUnzippedStream,
  findFileName: findFileName
};
