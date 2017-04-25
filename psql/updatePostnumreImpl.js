"use strict";

const {go} = require('ts-csp');

const importUtil = require('../importUtil/importUtil');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const {materializeDawa} = require('../importUtil/materialize');

const POSTNUMMER_COUMNS = ['nr', 'navn', 'stormodtager', 'tsv'];

function loadPostnummerCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, POSTNUMMER_COUMNS,
  row => ({ nr: row.postnr, navn: row.navn, stormodtager: row.stormodtager}));
}

const postnumreTableModel = tableModel.tables.postnumre;

module.exports = (client, txid, inputFile) => go(function*() {
  yield importUtil.createTempTableFromTemplate(client, 'updated_postnumre', 'postnumre', POSTNUMMER_COUMNS);
  yield loadPostnummerCsv(client, inputFile, 'updated_postnumre');
  yield tableDiffNg.computeDifferences(client, txid, 'updated_postnumre', postnumreTableModel);
  yield tableDiffNg.applyChanges(client, txid, postnumreTableModel);
  yield materializeDawa(client, txid);

});
