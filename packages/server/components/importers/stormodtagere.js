"use strict";

const {go} = require('ts-csp');

const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableModel = require('../../psql/tableModel');

const STORMODTAGER_COLUMNS = ['nr', 'navn', 'adgangsadresseid'];

function loadStormodtagerCsv(client, inputFile, tableName) {
  return importUtil.streamCsvToTable(client, inputFile, tableName, STORMODTAGER_COLUMNS, row => ({
    adgangsadresseid: row.Adgangsadresseid,
    nr: row.Firmapostnr,
    navn: row.Bynavn
  }));
}

const stormodtagerTableModel = tableModel.tables.stormodtagere;

const createStormodtagerImporter = ({filePath}) => {
  return {
    requires: [],
    produces: ['stormodtagere'],
    execute: (client, txid, strategy, context) => go(function*(){
      yield importUtil.createTempTableFromTemplate(client, 'updated_stormodtagere', 'stormodtagere', STORMODTAGER_COLUMNS);
      yield loadStormodtagerCsv(client, filePath, 'updated_stormodtagere');
      yield tableDiffNg.computeDifferences(client, txid, 'updated_stormodtagere', stormodtagerTableModel);
      yield tableDiffNg.applyChanges(client, txid, stormodtagerTableModel);
    })
  }
};
module.exports = {
  createStormodtagerImporter
};
