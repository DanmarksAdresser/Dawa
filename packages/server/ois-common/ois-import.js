const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const _ = require('underscore');
const Promise = require('bluebird');
const {go} = require('ts-csp');
const rawXmlStream = require('./rawXmlStreamExpat');
const logger = require('@dawadk/common/src/logger').forCategory('oisImport');

const createUnzipperProcess = (filePath, filePattern) => {
  const args = ['e', '-so', path.resolve(filePath), filePattern];
  const proc = child_process.spawn('7za', args);
  return proc;
}

const unzipToTempFile = (filePath, filePattern) => {
  const tmpFile = tmp.fileSync();
  const out = fs.createWriteStream(tmpFile.name);
  var args = ['e', '-so', path.resolve(filePath), filePattern];
  var proc = child_process.spawn('7za', args);
  proc.stdout.pipe(out);
  return new Promise(resolve => {
    out.on('finish', () => resolve(tmpFile));
  })
};

const createOisStream = (dataDir, fileName, oisTable) => go(function* () {
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const filePath = path.join(dataDir, fileName);
  const unzipperProc = createUnzipperProcess(filePath, xmlFileName);
  const xmlStream = rawXmlStream(unzipperProc.stdout, oisTable);
  return xmlStream;
});

const getOisFileRegex = registerName =>
  new RegExp(`^ois_${registerName}_(co\\d+t)_(na|da|te)000_(\\d+)_(\\d+)_(\\d+).zip$`, 'i');

const fileNameToDescriptor = (registerName, fileName) => {
  const match = getOisFileRegex(registerName).exec(fileName);
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

const getLastImportedSerial = (client, oisTable) => go(function* () {
  const alreadyImportedSerialsSql = `SELECT max(serial) as serial
                                     FROM ois_importlog
                                     WHERE entity = $1`;
  return (yield client.queryRows(alreadyImportedSerialsSql, [oisTable]))[0].serial;
});

const findFilesToImportForEntity = (client, oisRegister, oisTable, dataDir) => go(function* () {
  const filesAndDirectories = yield Promise.promisify(fs.readdir)(dataDir);
  const files = [];
  for (let fileOrDirectory of filesAndDirectories) {
    const stat = yield Promise.promisify(fs.stat)(path.join(dataDir, fileOrDirectory));
    if (!stat.isDirectory()) {
      files.push(fileOrDirectory);
    }
  }
  const oisFileRegex = getOisFileRegex(oisRegister);
  const oisFiles = files.filter(file => oisFileRegex.test(file));
  const descriptors = oisFiles.map(file => fileNameToDescriptor(oisRegister, file));
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
  const lastImportedSerial = yield getLastImportedSerial(client, oisTable);
  const lastTotalSerial = _.max(descriptors.filter(descriptor => descriptor.total).map(descriptor => descriptor.serial));
  const firstSerialToImport = Math.max(lastImportedSerial + 1, lastTotalSerial);
  const serialsToImport = serials.filter(serial => serial >= firstSerialToImport);
  serialsToImport.sort((a, b) => a - b);
  if (serialsToImport.length === 0) {
    return [];
  }
  const firstImportedSerial = serialsToImport[0];
  if (firstImportedSerial !== firstSerialToImport) {
    logger.error('Missing serial', {
      oisTable,
      serial: lastImportedSerial + 1
    });
    throw new Error('Missing serial');
  }
  for (let i = 0; i < serialsToImport.length - 2; ++i) {
    if (serialsToImport[i] + 1 !== serialsToImport[i + 1]) {
      logger.error('Missing serial', {
        oisTable,
        serial: serialsToImport[i] + 1
      });
      throw new Error('Missing serial');
    }
  }
  return serialsToImport.map(serial => serialToFileMap[serial][0]);
});


module.exports = {
  createUnzipperProcess,
  getOisFileRegex,
  fileNameToDescriptor,
  getLastImportedSerial,
  createOisStream,
  findFilesToImportForEntity
};