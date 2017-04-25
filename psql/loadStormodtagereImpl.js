"use strict";

const {go} = require('ts-csp');

const importUtil = require('../importUtil/importUtil');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const {materializeDawa} = require('../importUtil/materialize');

const STORMODTAGER_COLUMNS = ['nr', 'navn', 'adgangsadresseid'];

function loadStormodtagerCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, STORMODTAGER_COLUMNS, row => ({
    adgangsadresseid: row.Adgangsadresseid,
    nr: row.Firmapostnr,
    navn: row.Bynavn
  }));
}

const stormodtagerTableModel = tableModel.tables.stormodtagere;

module.exports = (client, txid, inputFile) => go(function*() {
  yield importUtil.createTempTableFromTemplate(client, 'updated_stormodtagere', 'stormodtagere', STORMODTAGER_COLUMNS);
  yield loadStormodtagerCsv(client, inputFile, 'updated_stormodtagere');
  yield tableDiffNg.computeDifferences(client, txid, 'updated_stormodtagere', stormodtagerTableModel);
  yield tableDiffNg.applyChanges(client, txid, stormodtagerTableModel);
  yield materializeDawa(client, txid);
});
