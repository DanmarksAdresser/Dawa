"use strict";

var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');


var importDarImpl = require('../darImport/importDarImpl');
var initialization = require('./initialization');
var sqlCommon = require('./common');

function getColumnsFromCsv(file) {
  const csvContent = fs.readFileSync(file, {encoding: 'utf8'});
  const header = csvContent.substring(0, csvContent.indexOf('\n'));
  return header.split(';');
}

function copyCsvToTable(client, table, csvFile, columns) {
  return client.queryp(`COPY ${table} (${columns.join(', ')}) FROM '${csvFile}' (format 'csv', header true, delimiter ';', quote '"', encoding 'utf8')`);
}

function loadTemaer(client, dataDir) {
  return q.async(function*() {
    const file = path.resolve(path.join(dataDir, `temaer.csv`));
    const columns = getColumnsFromCsv(file);
    const columnsWithoutId = _.without(columns, 'id');
    const tmpTable = 'tmpTemaer';
    // copy CSV to a temp table
    yield client.queryp(`CREATE TEMP TABLE ${tmpTable} AS (select * from temaer where false)`);
    yield copyCsvToTable(client, tmpTable, file, columns);
    // insert into temaer without the id column
    yield client.queryp(`INSERT INTO temaer(${columnsWithoutId.join(', ')}) (SELECT ${columnsWithoutId.join(', ')} FROM ${tmpTable})`);
    yield client.queryp(`DROP TABLE ${tmpTable}`);
  })();
}

module.exports = function (client, dataDir) {
  return q.async(function*() {

    // we need triggers to be enabled when loading temaer
    yield loadTemaer(client, dataDir);

    yield sqlCommon.disableTriggersQ(client);
    for (let table of ['dar_adgangspunkt', 'dar_husnummer', 'dar_adresse', 'dar_vejnavn', 'dar_postnr', 'dar_supplerendebynavn', 'cpr_vej', 'cpr_postnr']) {
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
    yield importDarImpl.fullCompareAndUpdate(client, true);
    yield client.queryp(
      `UPDATE vejstykker v SET geom = g.geom FROM vejstykker_geom g
         WHERE v.kommunekode = g.kommunekode AND v.kode = g.kode`);

    yield client.queryp('CREATE TEMP TABLE hoejder AS (select id, z_x, z_y, hoejde FROM adgangsadresser WHERE false)');
    yield copyCsvToTable(client,
      'hoejder',
      path.resolve(path.join(dataDir, 'hoejder.csv')),
      ['id', 'z_x', 'z_y', 'hoejde']);
    yield client.queryp('UPDATE adgangsadresser a SET z_x = h.z_x, z_y = h.z_y, hoejde = h.hoejde FROM hoejder h WHERE a.id = h.id');
    yield initialization.initializeHistory(client);
    yield initialization.initializeTables(client);
    yield sqlCommon.enableTriggersQ(client);
  })();
};
