"use strict";

const {go} = require('ts-csp');

const importUtil = require('../importUtil/importUtil');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const {deriveColumns, assignSequenceNumbers} = require('../importUtil/tableModelUtil');
const EJERLAV_COLUMNS = ['kode', 'navn', 'tsv'];

function loadEjerlavCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, EJERLAV_COLUMNS);
}

const ejerlavTableModel = tableModel.tables.ejerlav;

module.exports = (client, txid, inputFile) => go(function*() {
  yield importUtil.createTempTableFromTemplate(client, 'updated_ejerlav', 'ejerlav', EJERLAV_COLUMNS);
  yield loadEjerlavCsv(client, inputFile, 'updated_ejerlav');
  yield deriveColumns(client, 'updated_ejerlav', ejerlavTableModel);
  yield tableDiffNg.computeDifferences(client, txid, 'updated_ejerlav', ejerlavTableModel);
  yield tableDiffNg.applyChanges(client, txid, ejerlavTableModel);
  yield assignSequenceNumbers(client, txid, ejerlavTableModel, ['delete', 'update', 'insert']);
});
