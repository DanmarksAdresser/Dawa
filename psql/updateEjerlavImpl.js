"use strict";

const {go} = require('ts-csp');

const importUtil = require('../importUtil/importUtil');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const EJERLAV_COLUMNS = ['kode', 'navn', 'tsv'];
const {materializeDawa} = require('../importUtil/materialize');

function loadEjerlavCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, EJERLAV_COLUMNS);
}

const ejerlavTableModel = tableModel.tables.ejerlav;

module.exports = (client, txid, inputFile) => go(function*() {
  yield importUtil.createTempTableFromTemplate(client, 'updated_ejerlav', 'ejerlav', EJERLAV_COLUMNS);
  yield loadEjerlavCsv(client, inputFile, 'updated_ejerlav');
  yield tableDiffNg.computeDifferences(client, txid, 'updated_ejerlav', ejerlavTableModel);
  yield tableDiffNg.applyChanges(client, txid, ejerlavTableModel);
  yield materializeDawa(client, txid);
});
