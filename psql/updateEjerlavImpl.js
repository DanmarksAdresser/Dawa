"use strict";

var q = require('q');

const importUtil = require('../importUtil/importUtil');
const tableDiff = require('../importUtil/tablediff');

const EJERLAV_COLUMNS = ['kode', 'navn'];

function loadEjerlavCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, EJERLAV_COLUMNS);
}

module.exports = function(client, inputFile) {
  return q.async(function*() {
    yield importUtil.createTempTableFromTemplate(client, 'updated_ejerlav', 'ejerlav', EJERLAV_COLUMNS);
    yield loadEjerlavCsv(client, inputFile, 'updated_ejerlav');
    yield tableDiff.computeDifferences(client, 'updated_ejerlav', 'ejerlav', ['kode'], ['navn']);
    yield tableDiff.applyChanges(client, 'ejerlav', 'ejerlav', ['kode'], EJERLAV_COLUMNS, ['navn']);
    yield tableDiff.dropChangeTables(client, 'ejerlav');
  })();
};
