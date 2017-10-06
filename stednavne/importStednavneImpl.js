"use strict";

const fs = require('fs');
const JSONStream = require('JSONStream');
const { go } = require('ts-csp');

const { streamToTablePipeline} = require('../importUtil/importUtil');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const tableDiffNg = require('../importUtil/tableDiffNg');
const stednavneTableModel = require('../psql/tableModel').tables.stednavne;
const {
  updateSubdividedTableNg,
  updateGeometricTableNg,
  refreshAdgangsadresserRelation
} = require('../apiSpecification/flats/importFlatUtil');


const importStednavneFromStream = (client, txid, stream) => go(function*() {
  yield client.query('create temp table fetch_stednavne_raw(id uuid, hovedtype text, undertype text, navn text, navnestatus text, egenskaber jsonb, geomjson text)');
  const jsonTransformer = JSONStream.parse('features.*');
  const mapFn = geojsonFeature => {
    const raw = geojsonFeature.properties;
    const egenskaber = {};
    if(raw.FEAT_TYPE === 'Bebyggelse') {
      egenskaber.bebyggelseskode = raw.BEBYGGELSESKODE
    }
    return {
      id: raw.ID_LOKALID,
      hovedtype: raw.FEAT_TYPE,
      undertype: raw.UNDER_TYPE,
      navn: raw.NAVN,
      navnestatus: raw.NAVNESTATUS,
      egenskaber: JSON.stringify(egenskaber),
      geomjson: geojsonFeature.geometry ? JSON.stringify(geojsonFeature.geometry) : null
    };
  };
  const rawColumns = ['id', 'hovedtype', 'undertype', 'navn', 'navnestatus', 'egenskaber', 'geomjson'];

  yield promisingStreamCombiner([stream, jsonTransformer, ...streamToTablePipeline(client, 'fetch_stednavne_raw', rawColumns, mapFn)]);
  yield client.query(`CREATE TEMP TABLE fetch_stednavne AS (SELECT DISTINCT ON(id) id, hovedtype, undertype, navn, navnestatus,egenskaber, st_setsrid(st_geomfromgeojson(geomjson), 25832)::geometry as geom FROM fetch_stednavne_raw)`);
  yield client.query('DROP TABLE fetch_stednavne_raw');

  const idColumns = ['id'];
  const nonIdColumns = ['hovedtype', 'undertype', 'navn', 'navnestatus', 'egenskaber', 'geom'];
  const allColumns = [...idColumns, ...nonIdColumns];
  yield tableDiffNg.computeDifferences(client, txid, `fetch_stednavne`, stednavneTableModel, allColumns);
  yield client.query('analyze stednavne; analyze stednavne_changes');
  yield updateGeometricTableNg(client, txid, stednavneTableModel);
  yield updateSubdividedTableNg(client, txid, 'stednavne');
  yield client.query('drop table fetch_stednavne');
  yield refreshAdgangsadresserRelation(client, ['id'], 'stednavne', ['stednavn_id'], 'stednavne_adgadr');

});

const importStednavne = (client,txid,  filePath) => go(function*() {
  const stream = fs.createReadStream(filePath, {encoding: 'utf8'});

  yield importStednavneFromStream(client, txid, stream);
});

module.exports = {
  importStednavne,
  importStednavneFromStream
};
