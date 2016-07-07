"use strict";

const es = require('event-stream');
const fs = require('fs');
const JSONStream = require('JSONStream');
const q = require('q');
const _ = require('underscore');

const bebyggelse = require('../apiSpecification/flats/flats').bebyggelse;
const geojsonUtil = require('../geojsonUtil');
const importUtil = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const sqlCommon = require('../psql/common');
const tablediff = require('../importUtil/tablediff');

const ID_COLUMNS = bebyggelse.key;
const NON_ID_COLUMNS = _.difference(_.pluck(bebyggelse.fields, 'name'), ID_COLUMNS).concat(['geom']);
const COLUMNS = ID_COLUMNS.concat(NON_ID_COLUMNS);

function parseInteger(str) {
  if (str !== null && str !== undefined && str != '') {
    return parseInt(str, 10);
  }
  return null;
}

function createTempTable(client, tableName) {
  return client.queryp(`CREATE TEMP TABLE ${tableName} (
    id uuid NOT NULL,
    kode integer,
    type bebyggelsestype NOT NULL,
    navn text NOT NULL,
    geom geometry(MultiPolygon, 25832) NOT NULL
    )`);
}

function streamToTable(client, stream, tableName) {
  const jsonTransformer = JSONStream.parse('features.*');
  const mapper = es.mapSync(geojsonFeature => {
    const properties = geojsonFeature.properties;
    return {
      id: properties.ID_LOKALID,
      kode: parseInteger(properties.BEBYGGELSESKODE),
      type: properties.BEBYGGELSESTYPE,
      navn: properties.SKRIVEMAADE,
      geom: geojsonUtil.toPostgresqlGeometry(geojsonFeature.geometry, false, true)
    };
  });
  const stringifier = importUtil.copyStreamStringifier(COLUMNS);
  const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
  return promisingStreamCombiner([stream, jsonTransformer, mapper, stringifier, copyStream]);
}

function computeDifferences(client, srcTable, dstTable) {
  return tablediff.computeDifferences(client, srcTable, dstTable, ID_COLUMNS, NON_ID_COLUMNS)
}

function applyChanges(client, table) {
  return tablediff.applyChanges(client, table, table, ID_COLUMNS, COLUMNS, NON_ID_COLUMNS);
}

function importBebyggelserFromStream(client, stream, table, initial) {
  return q.async(function*() {
    if (initial) {
      yield streamToTable(client, stream, table);
    }
    else {
      const desiredTable = 'desired_' + table;
      yield createTempTable(client, desiredTable);
      yield streamToTable(client, stream, desiredTable);
      yield computeDifferences(client, desiredTable, table);
      yield importUtil.dropTable(client, desiredTable);
      yield client.queryp('UPDATE bebyggelser b SET ændret = NOW() FROM update_bebyggelser u WHERE b.id = u.id');
      yield client.queryp('UPDATE bebyggelser b SET geo_ændret = NOW(), geo_version=geo_version+1 FROM update_bebyggelser u WHERE b.id = u.id AND b.geom IS DISTINCT FROM u.geom');
      yield applyChanges(client, table);
    }
    if (initial) {
      yield client.queryp(`INSERT INTO bebyggelser_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM bebyggelser)`);
    }
    else {
      yield client.queryp('DELETE FROM bebyggelser_divided d USING update_bebyggelser b WHERE d.id = b.id');
      yield client.queryp('DELETE FROM bebyggelser_divided d USING delete_bebyggelser b WHERE d.id = b.id');
      yield client.queryp('INSERT INTO bebyggelser_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM insert_bebyggelser)');
      yield client.queryp('INSERT INTO bebyggelser_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM update_bebyggelser)');
    }
    if (initial) {
      yield sqlCommon.disableTriggersQ(client);
      yield client.queryp(
        `INSERT INTO bebyggelser_adgadr(bebyggelse_id, adgangsadresse_id) 
        (SELECT DISTINCT b.id, a.id FROM adgangsadresser a 
         JOIN bebyggelser_divided b ON ST_Covers(b.geom, a.geom))`);
      yield client.queryp(
        `INSERT INTO bebyggelser_adgadr_history(bebyggelse_id, adgangsadresse_id) 
        (SELECT bebyggelse_id, adgangsadresse_id from bebyggelser_adgadr)`);
      yield sqlCommon.enableTriggersQ(client);
    }
    else {
      const relColumns = ['bebyggelse_id', 'adgangsadresse_id'];
      yield client.queryp(`CREATE TEMP TABLE changed_ids AS ((SELECT id from insert_bebyggelser) 
      UNION (select id from update_bebyggelser) 
      UNION (select id from delete_bebyggelser))`);
      yield client.queryp(`CREATE TEMP TABLE desired AS \
(SELECT DISTINCT b.id as bebyggelse_id, a.id as adgangsadresse_id \
FROM bebyggelser_divided b JOIN adgangsadresser a ON ST_Covers(b.geom, a.geom) \
JOIN changed_ids ON b.id = changed_ids.id)`);
      yield client.queryp(`CREATE TEMP TABLE current AS \
(SELECT bebyggelse_id, adgangsadresse_id \
FROM bebyggelser_adgadr \
JOIN changed_ids ON bebyggelser_adgadr.bebyggelse_id = changed_ids.id)`);
      yield tablediff.computeDifferences(client, 'desired', 'current', relColumns, []);
      yield tablediff.applyChanges(client, 'current', 'bebyggelser_adgadr', relColumns, relColumns, []);
      yield tablediff.dropChangeTables(client, 'current');
      yield importUtil.dropTable(client, 'desired');
      yield importUtil.dropTable(client, 'current');
    }
    yield tablediff.dropChangeTables(client, 'bebyggelser');
  })();
}

function importBebyggelser(client, filePath, table, initial) {
  const src = fs.createReadStream(filePath, {encoding: 'utf8'});
  return importBebyggelserFromStream(client, src, table, initial);
}

module.exports = {
  importBebyggelser: importBebyggelser,
  importBebyggelserFromStream: importBebyggelserFromStream
};
