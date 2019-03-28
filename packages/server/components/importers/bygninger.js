"use strict";

const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');

const { streamToTablePipeline} = require('@dawadk/import-util/src/postgres-streaming');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableModel = require('../../psql/tableModel');
const bygningerTableModel = tableModel.tables.bygninger;
const { computeVisualCenter } = require('@dawadk/import-util/src/visual-center');

const importBygningerFromStream = (client, txid, stream, maxChanges) => go(function*() {
  yield client.query('create temp table fetch_bygninger_raw(id bigint, bygningstype text, ændret timestamptz, metode3d text, målested text, bbrbygning_id uuid, synlig boolean, overlap boolean, visueltcenter text, geomjson text)');
  const jsonTransformer = JSONStream.parse('features.*');
  const mapFn = geojsonFeature => {
    const raw = geojsonFeature.properties;
    const geometry = geojsonFeature.geometry;
    const visueltCenter = computeVisualCenter(geometry);
    return {
      id: raw.ID_LOKALID,
      bygningstype: raw.BYGNINGSTYPE,
      ændret: raw.REGISTRERINGFRA,
      målested: raw.MAALESTEDBYGNING,
      metode3d: raw.METODE3D,
      bbrbygning_id: raw.BBRUUID,
      synlig: raw.SYNLIGBYGNING === 'true' ,
      overlap: raw.OVERLAPBYGNING === 'true',
      visueltcenter: visueltCenter ? JSON.stringify({type: 'Point', coordinates: visueltCenter}) : null,
      geomjson: geojsonFeature.geometry ? JSON.stringify(geojsonFeature.geometry) : null
    };
  };
  const rawColumns = ['id', 'bygningstype', 'ændret', 'målested', 'metode3d', 'bbrbygning_id', 'synlig', 'overlap', 'visueltcenter', 'geomjson'];

  yield promisingStreamCombiner([stream, jsonTransformer, ...streamToTablePipeline(client, 'fetch_bygninger_raw', rawColumns, mapFn)]);

  yield client.query('CREATE TEMP TABLE fetch_bygninger AS select * from bygninger WHERE false');
  yield client.query(`INSERT INTO fetch_bygninger(id, bygningstype, ændret, målested, metode3d, bbrbygning_id, synlig, overlap, visueltcenter, geom)
  (select id, bygningstype, ændret, målested, metode3d,bbrbygning_id, synlig, overlap,
   st_setsrid(st_geomfromgeojson(visueltcenter), 25832), 
   st_setsrid(ST_GeomFromGeoJSON(geomjson), 25832)
   FROM fetch_bygninger_raw)`);
  client.query('update fetch_bygninger set visueltcenter = ST_ClosestPoint(fetch_bygninger.geom, ST_Centroid(fetch_bygninger.geom)) where visueltcenter is null');

  yield tableDiffNg.computeDifferences(client, txid, `fetch_bygninger`, bygningerTableModel);

  yield client.query('analyze bygninger; analyze bygninger_changes');
  yield tableDiffNg.applyChanges(client, txid, bygningerTableModel);
  yield client.query('drop table fetch_bygninger_raw; drop table fetch_bygninger');
});

const importBygninger = (client,txid,  filePath, maxChanges) => go(function*() {
  const stream = fs.createReadStream(filePath, {encoding: 'utf8'});

  yield importBygningerFromStream(client, txid, stream, maxChanges);
});

const createBygningImporter = ({filePath}) => {
  return {
    id: 'Building-importer',
    description: 'Bygningspolygon importer',
    requires: [],
    produces: ['bygninger'],
    execute: (client, txid) => importBygninger(client, txid, filePath)

  }
};

module.exports = { createBygningImporter };

