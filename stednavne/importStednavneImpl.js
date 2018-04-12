"use strict";

const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');
const polylabel = require('@mapbox/polylabel');
const geojsonArea = require('@mapbox/geojson-area');
const _ = require('underscore');

const { streamToTablePipeline} = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const stednavneTableModel = tableModel.tables.stednavne;
const { recomputeMaterialization, materialize } = require('../importUtil/materialize');

const {
  updateSubdividedTable,
  updateGeometricFields
} = require('../importUtil/geometryImport');


const importStednavneFromStream = (client, txid, stream) => go(function*() {
  yield client.query('create temp table fetch_stednavne_raw(id uuid, hovedtype text, undertype text, navn text, navnestatus text, bebyggelseskode integer, visueltcenter text, geomjson text)');
  const jsonTransformer = JSONStream.parse('features.*');
  const mapFn = geojsonFeature => {
    const raw = geojsonFeature.properties;
    if(raw.BRUGSPRIORITET === 'sekundær') {
      return null;
    }
    const geometry = geojsonFeature.geometry;
    let visueltCenter = null;
    if(geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates;
      visueltCenter = polylabel(coordinates, 0.1);
    }
    else if (geometry.type === 'MultiPolygon') {
      const polygons = geometry.coordinates.map(polyCoords => ({type: 'Polygon', coordinates: polyCoords}));
      const areas = polygons.map(polygon => [polygon, geojsonArea.geometry(polygon)]);
      const largestPolygon = _.max(areas, ([polygon, area]) => area)[0];
      visueltCenter = polylabel(largestPolygon.coordinates, 0.1);
    }
    return {
      id: raw.ID_LOKALID,
      hovedtype: raw.FEAT_TYPE,
      undertype: raw.UNDER_TYPE,
      navn: raw.NAVN,
      navnestatus: raw.NAVNESTATUS,
      bebyggelseskode: raw.BEBYGGELSESKODE,
      visueltcenter: visueltCenter ? JSON.stringify({type: 'Point', coordinates: visueltCenter}) : null,
      geomjson: geojsonFeature.geometry ? JSON.stringify(geojsonFeature.geometry) : null
    };
  };
  const rawColumns = ['id', 'hovedtype', 'undertype', 'navn', 'navnestatus', 'bebyggelseskode', 'visueltcenter', 'geomjson'];

  yield promisingStreamCombiner([stream, jsonTransformer, ...streamToTablePipeline(client, 'fetch_stednavne_raw', rawColumns, mapFn)]);
  yield client.query(`CREATE TEMP TABLE fetch_stednavne AS (SELECT DISTINCT ON(id) id, hovedtype, undertype, navn, navnestatus,bebyggelseskode, st_setsrid(st_geomfromgeojson(visueltcenter), 25832)::geometry as visueltcenter, st_setsrid(st_geomfromgeojson(geomjson), 25832)::geometry as geom FROM fetch_stednavne_raw)`);
  yield client.query('DROP TABLE fetch_stednavne_raw; ANALYZE fetch_stednavne');

  const idColumns = ['id'];
  const nonIdColumns = ['hovedtype', 'undertype', 'navn', 'navnestatus', 'bebyggelseskode', 'geom'];
  const allColumns = [...idColumns, ...nonIdColumns];
  yield tableDiffNg.computeDifferences(client, txid, `fetch_stednavne`, stednavneTableModel, allColumns);
  yield client.query('analyze stednavne; analyze stednavne_changes');
  yield client.query('UPDATE stednavne_changes c SET visueltcenter = f.visueltcenter FROM fetch_stednavne f WHERE c.id = f.id and f.visueltcenter is not null');
  yield updateGeometricFields(client, txid, stednavneTableModel);
  yield tableDiffNg.applyChanges(client, txid, stednavneTableModel);
  yield updateSubdividedTable(client, txid, 'stednavne', 'stednavne_divided', ['id']);
  yield client.query('drop table fetch_stednavne; analyze stednavne_divided');
  yield recomputeMaterialization(client, txid, tableModel.tables, tableModel.materializations.stednavne_adgadr);
  yield recomputeMaterialization(client, txid, tableModel.tables, tableModel.materializations.ikke_brofaste_oer);
  yield materialize(client, txid, tableModel.tables, tableModel.materializations.ikke_brofaste_adresser);
  yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY stednavn_kommune');
  yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY stednavntyper');

});

const importStednavne = (client,txid,  filePath) => go(function*() {
  const stream = fs.createReadStream(filePath, {encoding: 'utf8'});

  yield importStednavneFromStream(client, txid, stream);
});

module.exports = {
  importStednavne,
  importStednavneFromStream
};
