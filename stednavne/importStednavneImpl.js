"use strict";

const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');

const { streamToTablePipeline} = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const tableDiffNg = require('../importUtil/tableDiffNg');
const tableModel = require('../psql/tableModel');
const stederTableModel = tableModel.tables.steder;
const stednavneTableModel = tableModel.tables.stednavne;
const { recomputeMaterialization, materialize } = require('../importUtil/materialize');
const { computeVisualCenter } = require('../importUtil/geometryImport');

const {
  refreshSubdividedTable,
  updateGeometricFields
} = require('../importUtil/geometryImport');


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

  yield client.query('CREATE TEMP TABLE fetch_stednavne AS select * from stednavne WHERE false');
  yield client.query(`INSERT INTO fetch_stednavne(${stednavneColumns.join(',')}) (
  SELECT distinct on (id, brugsprioritet,navn) id, navn, navnestatus, brugsprioritet FROM fetch_stednavne_raw)`);

  yield tableDiffNg.computeDifferences(client, txid, `fetch_stednavne`, stednavneTableModel, stednavneColumns);
  yield tableDiffNg.applyChanges(client, txid, stednavneTableModel);

  yield tableDiffNg.computeDifferences(client, txid, `fetch_steder`, stederTableModel, stederColumns);
  yield client.query('analyze stednavne; analyze stednavne_changes; analyze steder; analyze steder_changes');
  yield updateGeometricFields(client, txid, stederTableModel);
  yield tableDiffNg.applyChanges(client, txid, stederTableModel);
  yield refreshSubdividedTable(client, 'steder', 'steder_divided', ['id'], true);
  yield client.query('drop table fetch_stednavne_raw; drop table fetch_stednavne; drop table fetch_steder; analyze steder_divided');
  yield recomputeMaterialization(client, txid, tableModel.tables, tableModel.materializations.stedtilknytninger);
  yield materialize(client, txid, tableModel.tables, tableModel.materializations.ikke_brofaste_adresser);
  yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY sted_kommune');
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
