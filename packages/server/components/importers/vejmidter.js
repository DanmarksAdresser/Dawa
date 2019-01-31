"use strict";

const es = require('event-stream');
const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');

const geojsonUtil = require('../geojsonUtil');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const {computeDifferences, applyChanges } = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('../../psql/tableModel');

const ID_COLUMNS = ['kommunekode', 'kode'];
const NON_ID_COLUMNS = ['geom'];
const COLUMNS = ID_COLUMNS.concat(NON_ID_COLUMNS);


function parseInteger(str) {
  if(str !== null && str !== undefined && str != ''){
    return parseInt(str, 10);
  }
  return null;
}
const streamToTempTable = (client, filePath, tableName) => go(function*() {
  yield client.queryp(`CREATE TEMP TABLE ${tableName} (
    kommunekode smallint NOT NULL,
    kode smallint NOT NULL,
    geom geometry(LineStringZ, 25832) NOT NULL
    )`);
  const src = fs.createReadStream(filePath, {encoding: 'utf8'});
  const jsonTransformer = JSONStream.parse('features.*');
  const mapper = es.mapSync(geojsonFeature => {
    const properties = geojsonFeature.properties;
    return {
      kommunekode: parseInteger(properties.KOMMUNEKODE),
      kode: parseInteger(properties.VEJKODE),
      geom: geojsonUtil.toPostgresqlGeometry(geojsonFeature.geometry, true)
    }
  });
  const stringifier = importUtil.copyStreamStringifier(COLUMNS);
  const copyStream = importUtil.copyStream(client, tableName, COLUMNS);
  yield promisingStreamCombiner([src, jsonTransformer, mapper, stringifier, copyStream]);
});

const importVejmidter = (client, txid, filePath) => go(function*() {
  const linestringsTable = 'vejstykker_linestrings';
  const desiredTable = 'desired_vejmidter';
  yield streamToTempTable(client, filePath, linestringsTable);
  yield client.queryp(`CREATE TEMP TABLE ${desiredTable} AS( 
    select kommunekode, kode, st_collect(geom) AS geom 
    FROM ${linestringsTable} 
    GROUP BY kommunekode, kode)`);
  yield importUtil.dropTable(client, linestringsTable);
  yield computeDifferences(client, txid, desiredTable, tableSchema.tables.vejmidter);
  yield importUtil.dropTable(client, desiredTable);
  yield applyChanges(client, txid, tableSchema.tables.vejmidter);
});

const createVejmidteImporter = ({filePath}) => {
  const execute = (client, txid) => importVejmidter(client, txid, filePath);
  return {
    id: 'Vejmidter',
    description: 'Vejmidte importer',
    execute,
    requires: [],
    produces: ['vejmidter']
  };
};

module.exports = {
  createVejmidteImporter
};