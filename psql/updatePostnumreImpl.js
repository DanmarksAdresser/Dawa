"use strict";

var q = require('q');

const importUtil = require('../importUtil/importUtil');
const tableDiff = require('../importUtil/tablediff');

const POSTNUMMER_COUMNS = ['nr', 'navn', 'stormodtager'];

function loadPostnummerCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, POSTNUMMER_COUMNS,
  row => ({ nr: row.postnr, navn: row.navn, stormodtager: row.stormodtager}));
}

module.exports = function(client, inputFile) {
  return q.async(function*() {
    yield importUtil.createTempTableFromTemplate(client, 'updated_postnumre', 'postnumre', POSTNUMMER_COUMNS);
    yield loadPostnummerCsv(client, inputFile, 'updated_postnumre');
    yield tableDiff.computeDifferences(client, 'updated_postnumre', 'postnumre', ['nr'], ['navn', 'stormodtager']);
    yield tableDiff.applyChanges(client, 'postnumre', ['nr'], POSTNUMMER_COUMNS, ['navn', 'stormodtager']);
    yield tableDiff.dropChangeTables(client, 'postnumre');
  })();
};
