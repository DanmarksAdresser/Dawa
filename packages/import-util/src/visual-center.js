const _ = require('underscore');
const { go } = require('ts-csp');
const format = require('pg-format');
const polylabel = require('@mapbox/polylabel');

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
};

/**
 * Compute the "visual center" for a geometry.
 * Check the documentation for the polylabel package for details.
 * @param geojsonGeometry
 * @returns {*}
 */
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

/**
 * Compute the visual center for all rows in the change table for current txid.
 * @param client
 * @param txid
 * @param tableModel
 * @returns {Process}
 */
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
      else {
        yield client.query(`UPDATE ${tableModel.table}_changes SET visueltcenter = ST_ClosestPoint(${tableModel.table}_changes.geom, ST_Centroid(${tableModel.table}_changes.geom))WHERE ${whereClause}`);
      }
    }
  }
});

module.exports = {
  computeVisualCenter,
  computeVisualCenters
};