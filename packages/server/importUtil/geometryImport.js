"use strict";
const { go } = require('ts-csp');
const format = require('pg-format');
const { initChangeTable, applyCurrentTableToChangeTable } = require('@dawadk/import-util/src/table-diff');
const { computeVisualCenter } = require('@dawadk/import-util/src/visual-center');
const {columnsEqualClause, selectList} = require('@dawadk/common/src/postgres/sql-util');

const updateSubdividedTable =
  (client, txid, baseTable, divTable, keyColumnNames, allowNonPolygons) => go(function* () {
    const forcePolygons = !allowNonPolygons;
    yield client.query(`DELETE FROM ${divTable} d USING ${baseTable}_changes t WHERE ${columnsEqualClause('d', 't', keyColumnNames)} AND txid = ${txid}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${selectList('t', keyColumnNames)}, splitToGridRecursive(t.geom, 64, ${forcePolygons}) AS geom 
        FROM ${baseTable}_changes c join ${baseTable} t ON ${columnsEqualClause('c', 't', keyColumnNames)} WHERE txid = ${txid})`);
  });

const refreshSubdividedTable =
  (client, baseTable, divTable, keyColumnNames, allowNonPolygons) => go(function* () {
    const forcePolygons = !allowNonPolygons;
    yield client.query(`DELETE FROM ${divTable}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${keyColumnNames.join(', ')}, splitToGridRecursive(geom, 64, ${forcePolygons}) AS geom FROM ${baseTable})`);
  });

const initBboxAndVisualCenters = (client, txid, tableModel, clearHistory) => go(function*() {
  if(clearHistory) {
    yield client.query(`DELETE FROM ${tableModel.table}_changes`);
  }
  const allPrimaryKeys = yield client.queryRows(`SELECT ${tableModel.primaryKey.join(',')}
    FROM ${tableModel.table} WHERE geom IS NOT NULL`);
  for(let key of allPrimaryKeys) {
    const whereClause = `${tableModel.primaryKey.map(keyName => format(`${keyName} = %L`, key[keyName])).join(' AND ')}`;
    const query = `SELECT st_asgeojson(geom) as geom_json, st_isvalid(geom) as valid FROM ${tableModel.table} WHERE ${whereClause}`;
    const queryResult = (yield client.queryRows(query))[0];
    const geojsonText = queryResult.geom_json;
    if(geojsonText) {
      const geojson = JSON.parse(geojsonText);
      const visualCenter = computeVisualCenter(geojson);
      const visualCenterGeojson = {type: 'Point', coordinates: visualCenter};
      if(visualCenter) {
        yield client.query(`UPDATE ${tableModel.table} SET visueltcenter = ST_SetSRID(ST_GeomFromGeoJSON($1), 25832),bbox=st_envelope(geom) WHERE ${whereClause}`, [JSON.stringify(visualCenterGeojson)]);
      }
    }
  }
  if(clearHistory) {
    yield initChangeTable(client, txid, tableModel);
  }
  else {
    yield applyCurrentTableToChangeTable(client, tableModel, ['bbox', 'visueltcenter']);
  }
});


module.exports = {
  updateSubdividedTable,
  refreshSubdividedTable,
  initVisualCenters: initBboxAndVisualCenters,
};