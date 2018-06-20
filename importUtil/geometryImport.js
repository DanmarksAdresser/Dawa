"use strict";
const _ = require('underscore');
const { go } = require('ts-csp');
const polylabel = require('@mapbox/polylabel');
const format = require('pg-format');
const { initChangeTable, applyCurrentTableToChangeTable } = require('./tableDiffNg');

const {columnsEqualClause} = require('../darImport/sqlUtil');

const linestringArea = (coordinates) => {
  let numPoints = coordinates.length;
  let area = 0;  // Accumulates area in the loop
  let j = numPoints-1;  // The last vertex is the 'previous' one to the first

  for (let i=0; i<numPoints; i++)
  { area -= (coordinates[j][0]+coordinates[i][0]) * (coordinates[j][1]-coordinates[i][1]);
    j = i;  //j is previous vertex to i
  }
  return area/2;
};

const polygonArea = (coordinates) => {
  let area = 0;
  for(let linestringCoords of coordinates) {
    area += linestringArea(linestringCoords);
  }
  return area;
}

const updateSubdividedTable =
  (client, txid, baseTable, divTable, keyColumnNames, allowNonPolygons) => go(function* () {
    const forcePolygons = !allowNonPolygons;
    yield client.query(`DELETE FROM ${divTable} d USING ${baseTable}_changes t WHERE ${columnsEqualClause('d', 't', keyColumnNames)} AND txid = ${txid}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${keyColumnNames.join(', ')}, splitToGridRecursive(geom, 64, ${forcePolygons}) AS geom FROM ${baseTable}_changes WHERE operation <> 'delete' AND txid = ${txid})`);
  });

const refreshSubdividedTable =
  (client, baseTable, divTable, keyColumnNames, allowNonPolygons) => go(function* () {
    const forcePolygons = !allowNonPolygons;
    yield client.query(`DELETE FROM ${divTable}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${keyColumnNames.join(', ')}, splitToGridRecursive(geom, 64, ${forcePolygons}) AS geom FROM ${baseTable})`);
  });

const updateGeometricFields = (client, txid, tableModel) => go(function* () {
  const table = tableModel.table;
  const changeTable = `${table}_changes`;
  yield client.query(`UPDATE ${changeTable} SET geo_version = 1, geo_ændret = NOW() WHERE operation = 'insert' and txid = ${txid}`);
  yield client.query(`UPDATE ${changeTable} SET ændret = NOW() WHERE operation = 'insert' OR operation = 'update' and txid = ${txid}`);
  yield client.query(`UPDATE ${changeTable} new SET geo_ændret = NOW(), geo_version = old.geo_version + 1
    FROM ${table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)} AND NOT ST_Equals(old.geom, new.geom) AND operation = 'update' and txid = ${txid}`);
});

const computeVisualCenter = geojsonGeometry => {
  if(geojsonGeometry.type === 'Polygon') {
    const coordinates = geojsonGeometry.coordinates;
    return polylabel(coordinates, 1);
  }
  else if (geojsonGeometry.type === 'MultiPolygon') {
    const polygons = geojsonGeometry.coordinates.map(polyCoords => ({type: 'Polygon', coordinates: polyCoords}));
    const areas = polygons.map(polygon => [polygon, polygonArea(polygon.coordinates)]);
    const largestPolygon = _.max(areas, ([polygon, area]) => area)[0];
    const visualCenter = polylabel(largestPolygon.coordinates, 1);
    return visualCenter;
  }
  else {
    return null;
  }
};

const computeVisualCenters = (client, txid, tableModel) => go(function* () {
  const allPrimaryKeys = yield client.queryRows(`SELECT ${tableModel.primaryKey.join(',')}
    FROM ${tableModel.table}_changes WHERE geom IS NOT NULL AND visueltcenter IS NULL AND txid = ${txid}`);
  for(let key of allPrimaryKeys) {
    const whereClause = `txid = ${txid}
      AND ${tableModel.primaryKey.map(keyName => format(`${keyName} = %L`, key[keyName])).join(' AND ')}`;
    const query = `SELECT st_asgeojson(geom) as geom_json, st_isvalid(geom) as valid FROM ${tableModel.table}_changes WHERE ${whereClause}`;
    const queryResult = (yield client.queryRows(query))[0];
    const geojsonText = queryResult.geom_json;
    if(geojsonText) {
      const geojson = JSON.parse(geojsonText);
      const visualCenter = computeVisualCenter(geojson);
      const visualCenterGeojson = {type: 'Point', coordinates: visualCenter};
      if(visualCenter) {
        yield client.query(`UPDATE ${tableModel.table}_changes SET visueltcenter = ST_SetSRID(ST_GeomFromGeoJSON($1), 25832) WHERE ${whereClause}`, [JSON.stringify(visualCenterGeojson)]);
      }
    }
  }
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
  updateGeometricFields,
  refreshSubdividedTable,
  initVisualCenters: initBboxAndVisualCenters,
  computeVisualCenter,
  computeVisualCenters
};