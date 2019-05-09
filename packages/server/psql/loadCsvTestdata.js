"use strict";

const fs = require('fs');
const path = require('path');

const {go} = require('ts-csp');
const {streamCsvToTable} = require('@dawadk/import-util/src/postgres-streaming');
const logger = require('@dawadk/common/src/logger').forCategory('loadTestData');

function getColumnsFromCsv(file) {
  const csvContent = fs.readFileSync(file, {encoding: 'utf8'});
  const header = csvContent.substring(0, csvContent.indexOf('\n'));
  return header.split(';');
}

function copyCsvToTable(client, table, csvFile, columns) {
  return streamCsvToTable(client, csvFile, table, columns, val => val);
}


module.exports = (client, txid, dataDir) => go(function* () {

  for (let table of ['dar_adgangspunkt', 'dar_husnummer', 'dar_adresse', 'dar_vejnavn', 'dar_postnr',
    'dar_supplerendebynavn', 'cpr_vej', 'cpr_postnr']) {
    logger.info('loading raw csv', {table});
    const file = path.resolve(path.join(dataDir, `${table}.csv`));
    const columns = getColumnsFromCsv(file);
    yield copyCsvToTable(client, table, file, columns);
  }
});
