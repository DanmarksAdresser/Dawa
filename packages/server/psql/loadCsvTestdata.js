"use strict";

const fs = require('fs');
const path = require('path');

const {go} = require('ts-csp');
const { initializeChangeTable } = require('@dawadk/import-util/src/table-diff');
const tableSchema  = require('./tableModel');


function getColumnsFromCsv(file) {
  const csvContent = fs.readFileSync(file, {encoding: 'utf8'});
  const header = csvContent.substring(0, csvContent.indexOf('\n'));
  return header.split(';');
}

function copyCsvToTable(client, table, csvFile, columns) {
  return client.queryp(`COPY ${table} (${columns.join(', ')}) FROM '${csvFile}' (format 'csv', header true, delimiter ';', quote '"', encoding 'utf8')`);
}


module.exports = (client, txid, dataDir) => go(function* () {

  for (let table of ['dar_adgangspunkt', 'dar_husnummer', 'dar_adresse', 'dar_vejnavn', 'dar_postnr',
    'dar_supplerendebynavn', 'cpr_vej', 'cpr_postnr']) {
    const file = path.resolve(path.join(dataDir, `${table}.csv`));
    const columns = getColumnsFromCsv(file);
    yield copyCsvToTable(client, table, file, columns);
  }
  yield copyCsvToTable(client,
    'vejmidter',
    path.resolve(path.join(dataDir, 'vejstykker_geom.csv')),
    ['kommunekode', 'kode', 'geom']);
  yield initializeChangeTable(client, txid, tableSchema.tables.vejmidter);
});
