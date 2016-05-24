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
const tablediff = require('../importUtil/tablediff');

const ID_COLUMNS = bebyggelse.key;
const NON_ID_COLUMNS = _.difference(_.pluck(bebyggelse.fields, 'name'), ID_COLUMNS).concat(['geom']);
const COLUMNS = ID_COLUMNS.concat(NON_ID_COLUMNS);

function parseInteger(str) {
  if(str !== null && str !== undefined && str != ''){
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

function streamToTable(client, filePath, tableName) {
  return q.async(function*() {
    const src = fs.createReadStream(filePath, {encoding: 'utf8'});
    const jsonTransformer = JSONStream.parse('features.*');
    const mapper = es.mapSync(geojsonFeature => {
      const properties = geojsonFeature.properties;
      return  {
        id: properties.ID_LOKALID,
        kode: parseInteger(properties.BEBYGGELSESKODE),
        type: properties.BEBYGGELSESTYPE,
        navn: properties.SKRIVEMAADE,
        geom: geojsonUtil.toPostgresqlGeometry(geojsonFeature.geometry, false, true)
      };
    });
    const stringifier = importUtil.copyStreamStringifier(COLUMNS);
    const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
    yield promisingStreamCombiner([src, jsonTransformer, mapper, stringifier, copyStream]);
  })();
}

function computeUpdates(client, srcTable, dstTable, upTable) {
  return tablediff.computeUpdates(client, srcTable, dstTable, upTable, ID_COLUMNS, NON_ID_COLUMNS)
}

function applyUpdates(client, upTable, dstTable) {
  return tablediff.applyUpdates(client, upTable, dstTable, ID_COLUMNS, NON_ID_COLUMNS);
}

function importBebyggelser(client, filePath, table, initial) {
  return q.async(function*() {
    if(initial) {
      yield streamToTable(client, filePath, table);
    }
    else {
      const desiredTable = 'desired_' + table;
      yield createTempTable(client, desiredTable);
      yield streamToTempTable(client, filePath, desiredTable);
      const upTable = 'update_' + table;
      yield computeUpdates(client, desiredTable, table, upTable);
      yield importUtil.dropTable(client, desiredTable);
      yield applyUpdates(client, upTable, table);
      yield importUtil.dropTable(client, upTable);
    }
  })();
}

module.exports = {
  importBebyggelser: importBebyggelser
};
