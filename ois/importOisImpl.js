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
    const columns = oisCommon.columnNames(entityName);
    const oisStream = yield createOisStream(entityName, dataDir, fileName);
    yield promisingStreamCombiner([oisStream].concat(importUtil.streamToTablePipeline(client, table, columns)));
  })();
}

const findFileName = (filesIndDirectory, entityName) => {
  const matches = _.filter(filesIndDirectory, function(file) {
    return file.toLowerCase().indexOf(oisCommon.oisTableName(entityName).toLowerCase()) !== -1;
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
  const columns = oisCommon.columnNames(entityName);
  return importUtil.createTempTableFromTemplate(client, fetchTable, template, columns);
}

function importOis(client, dataDir, delta) {
  return q.async(function*() {
    const files = fs.readdirSync(dataDir);
    for(const entityName of Object.keys(oisModels)) {

      const fileName = findFileName(files, entityName);
      const existingTableEmpty = yield isTableEmpty(client, oisCommon.dawaTableName(entityName));
      const filePath = path.join(dataDir, fileName);
      const table = oisCommon.dawaTableName(entityName);
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
        const columns = oisCommon.columnNames(entityName);
        yield tablediff.computeInserts(client, fetchTable, table, `insert_${table}`, keyColumns);
        yield tablediff.computeUpdates(client, fetchTable, table, `update_${table}`, keyColumns, columns);
        if(!delta) {
          yield tablediff.computeDeletes(client, fetchTable, table, `delete_${table}`, keyColumns);
        }
        yield importUtil.dropTable(client, fetchTable);
        yield tablediff.applyInserts(client, `insert_${table}`, table, columns, false);
        yield tablediff.applyUpdates(client, `update_${table}`, table, keyColumns, columns);
        if(!delta) {
          yield tablediff.applyDeletes(client, `delete_${table}`, table, keyColumns);
        }
        for(let prefix of ['insert_', 'update_']) {
          yield importUtil.dropTable(client, prefix + table);
        }
      }
    }
  })();
}

exports.oisFileToTable = oisFileToTable;
exports.importOis = importOis;
exports.internal = {
  createOisStream: createOisStream,
  createUnzippedStream: createUnzippedStream
};
