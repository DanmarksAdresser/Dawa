"use strict";

const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');

const { streamToTablePipeline} = require('@dawadk/import-util/src/postgres-streaming');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const tableModel = require('../../psql/tableModel');
const stederTableModel = tableModel.tables.steder;
const stednavneTableModel = tableModel.tables.stednavne;

const {
  refreshSubdividedTable
} = require('../../importUtil/geometryImport');

const { computeVisualCenter } = require('@dawadk/import-util/src/visual-center');

const importStednavneFromStream = (client, txid, stream) => go(function*() {
  yield client.query('create temp table fetch_stednavne_raw(id uuid, hovedtype text, undertype text, navn text, navnestatus text, brugsprioritet text, indbyggerantal integer, bebyggelseskode integer, visueltcenter text, geomjson text)');
  const jsonTransformer = JSONStream.parse('features.*');
  const mapFn = geojsonFeature => {
    const raw = geojsonFeature.properties;
    const geometry = geojsonFeature.geometry;
    const visueltCenter = computeVisualCenter(geometry);
    return {
      id: raw.ID_LOKALID,
      hovedtype: raw.FEAT_TYPE,
      undertype: raw.UNDER_TYPE,
      navn: raw.NAVN,
      navnestatus: raw.NAVNESTATUS,
      bebyggelseskode: raw.BEBYGGELSESKODE,
      indbyggerantal: raw.INDB_ANTAL,
      brugsprioritet: raw.BRUGSPRIORITET,
      visueltcenter: visueltCenter ? JSON.stringify({type: 'Point', coordinates: visueltCenter}) : null,
      geomjson: geojsonFeature.geometry ? JSON.stringify(geojsonFeature.geometry) : null
    };
  };
  const rawColumns = ['id', 'hovedtype', 'undertype', 'navn', 'navnestatus', 'brugsprioritet', 'indbyggerantal', 'bebyggelseskode', 'visueltcenter', 'geomjson'];

  yield promisingStreamCombiner([stream, jsonTransformer, ...streamToTablePipeline(client, 'fetch_stednavne_raw', rawColumns, mapFn)]);

  const stederColumns = ['id', 'hovedtype', 'undertype', 'indbyggerantal', 'bebyggelseskode', 'visueltcenter', 'geom'];
  const stednavneColumns = ['stedid', 'navn', 'navnestatus', 'brugsprioritet'];
  yield client.query('CREATE TEMP TABLE fetch_steder AS select * from steder WHERE false');
  yield client.query(`INSERT INTO fetch_steder(${stederColumns.join(',')})
  (select distinct on (id) id, hovedtype, undertype, indbyggerantal, bebyggelseskode, 
   st_setsrid(st_geomfromgeojson(visueltcenter), 25832), 
   st_setsrid(ST_GeomFromGeoJSON(geomjson), 25832)
   FROM fetch_stednavne_raw WHERE brugsprioritet = 'primær')`);
  client.query('update fetch_steder set visueltcenter = ST_ClosestPoint(fetch_steder.geom, ST_Centroid(fetch_steder.geom)) where visueltcenter is null');

  yield client.query('CREATE TEMP TABLE fetch_stednavne AS select * from stednavne WHERE false');

  // Mere end ét primært navn ikke tilladt, vi tager det første i alfabetisk orden hvis der leveres flere
  yield client.query(`INSERT INTO fetch_stednavne(${stednavneColumns.join(',')}) (
  SELECT distinct on (id) id, navn, navnestatus, brugsprioritet FROM fetch_stednavne_raw where brugsprioritet='primær' order by id,navn)`);
  // Identiske sekundære navne ikke tilladt
  yield client.query(`INSERT INTO fetch_stednavne(${stednavneColumns.join(',')}) (
  SELECT distinct on (id,navn) id, navn, navnestatus, brugsprioritet FROM fetch_stednavne_raw where brugsprioritet='sekundær')`);
  // sekundært navn må ikke være lig primært navn
  yield client.query(`DELETE FROM fetch_stednavne f WHERE f.brugsprioritet = 'sekundær' AND exists(select * from fetch_stednavne f2 where f2.brugsprioritet = 'primær' and f2.stedid = f.stedid and f2.navn = f.navn)`);

  yield tableDiffNg.computeDifferences(client, txid, `fetch_stednavne`, stednavneTableModel);
  yield tableDiffNg.applyChanges(client, txid, stednavneTableModel);

  yield tableDiffNg.computeDifferences(client, txid, `fetch_steder`, stederTableModel);
  yield client.query('analyze stednavne; analyze stednavne_changes; analyze steder; analyze steder_changes');
  yield tableDiffNg.applyChanges(client, txid, stederTableModel);
  yield refreshSubdividedTable(client, 'steder', 'steder_divided', ['id'], true);
  yield client.query('drop table fetch_stednavne_raw; drop table fetch_stednavne; drop table fetch_steder; analyze steder_divided');
  yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY sted_kommune');
  yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY stednavntyper');
});

const importStednavne = (client,txid,  filePath) => go(function*() {
  const stream = fs.createReadStream(filePath, {encoding: 'utf8'});

  yield importStednavneFromStream(client, txid, stream);
});

const createStednavneImporterFromStream = ({stream}) => {
  return {
    requires: [],
    produces: ['steder', 'stednavne'],
    execute: (client, txid) => importStednavneFromStream(client, txid, stream)
  };
};

const createStednavneImporter = ({filePath}) => {
  return {
    id: 'Place-importer',
    description: 'Stednavneimporter',
    requires: [],
    produces: ['steder', 'stednavne'],
    execute: (client, txid) => importStednavne(client, txid, filePath)
  };
};

module.exports = {
  createStednavneImporterFromStream,
  createStednavneImporter
};
