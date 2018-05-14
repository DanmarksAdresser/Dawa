"use strict";

const fs = require('fs');
const path = require('path');

const {go} = require('ts-csp');


function getColumnsFromCsv(file) {
  const csvContent = fs.readFileSync(file, {encoding: 'utf8'});
  const header = csvContent.substring(0, csvContent.indexOf('\n'));
  return header.split(';');
}

function copyCsvToTable(client, table, csvFile, columns) {
  return client.queryp(`COPY ${table} (${columns.join(', ')}) FROM '${csvFile}' (format 'csv', header true, delimiter ';', quote '"', encoding 'utf8')`);
}


module.exports = (client, dataDir) => go(function* () {

  for (let table of ['dar_adgangspunkt', 'dar_husnummer', 'dar_adresse', 'dar_vejnavn', 'dar_postnr',
    'dar_supplerendebynavn', 'cpr_vej', 'cpr_postnr']) {
    const file = path.resolve(path.join(dataDir, `${table}.csv`));
    const columns = getColumnsFromCsv(file);
    yield copyCsvToTable(client, table, file, columns);
  }
  yield client.queryp(`CREATE TEMP TABLE vejstykker_geom (
  kommunekode integer NOT NULL,
  kode integer NOT NULL,
  geom  geometry(MULTILINESTRINGZ, 25832),
  PRIMARY KEY(kommunekode, kode)
);`);
  yield copyCsvToTable(client,
    'vejstykker_geom',
    path.resolve(path.join(dataDir, 'vejstykker_geom.csv')),
    ['kommunekode', 'kode', 'geom']);
  yield client.queryp(
    `UPDATE vejstykker v SET geom = g.geom FROM vejstykker_geom g
         WHERE v.kommunekode = g.kommunekode AND v.kode = g.kode`);

});
