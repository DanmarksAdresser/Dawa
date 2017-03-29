"use strict";

const es = require('event-stream');
const fs = require('fs');
const JSONStream = require('JSONStream');
const q = require('q');
const { go } = require('ts-csp');

const geojsonUtil = require('../geojsonUtil');
const importUtil = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const sqlCommon = require('../psql/common');
const sqlUtil = require('../darImport/sqlUtil');
const tablediff = require('../importUtil/tablediff');

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

function computeUpdates(client, srcTable, dstTable, upTable) {
  return tablediff.computeUpdates(client, srcTable, dstTable, upTable, ID_COLUMNS, NON_ID_COLUMNS)
}

function applyUpdates(client, upTable, dstTable) {
  return tablediff.applyUpdates(client, upTable, dstTable, ID_COLUMNS, NON_ID_COLUMNS);
}

const importVejmidter = (client, filePath, table, initial) => go(function*() {
  const linestringsTable = 'vejstykker_linestrings';
  const desiredTable = 'desired_' + table;
  yield streamToTempTable(client, filePath, linestringsTable);
  yield client.queryp(`CREATE TEMP TABLE ${desiredTable} AS( 
    select kommunekode, kode, st_collect(geom) AS geom 
    FROM ${linestringsTable} 
    GROUP BY kommunekode, kode)`);
  yield importUtil.dropTable(client, linestringsTable);
  // we disable triggers because we do not want to generate history entries
  yield sqlCommon.disableTriggersQ(client);
  yield client.queryp(`UPDATE ${table}
      SET ${NON_ID_COLUMNS.map(column => column + ' = ' + desiredTable + '.' + column).join(', ')}
       FROM ${desiredTable} 
      WHERE ${sqlUtil.columnsEqualClause(desiredTable, table, ID_COLUMNS)}`);
  // initialize history table
  yield sqlCommon.enableTriggersQ(client);
  yield importUtil.dropTable(client, desiredTable);
});

module.exports = {
  importVejmidter
};
