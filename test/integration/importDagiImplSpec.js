"use strict";

const  { assert } = require('chai');
const { go } = require('ts-csp');
const testdb = require('../helpers/testdb2');
const importDagiImpl = require('../../dagiImport/importDagiImpl');
const { withImportTransaction } = require('../../importUtil/importUtil');
const featureMappingsDatafordeler = require('../../dagiImport/featureMappingsDatafordeler');
const path = require('path');

const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}Z$/;
describe('Import af DAGI temaer', () => {
  testdb.withTransactionAll('empty', clientFn => {
    let initialGeom;
    it('Kan importere afstemningsområde', () => go(function*(){
      const client = clientFn();
      yield withImportTransaction(client, 'dagiToDb', (txid) => go(function*() {
        yield importDagiImpl.importTemaerWfsMulti(client, txid, ['afstemningsområde'], featureMappingsDatafordeler, path.join(__dirname, 'importDagiImplSpec/initial'), '', 1000000);
        const temaRow = (yield client.queryRows('select dagi_id, nummer, navn, afstemningsstednavn, afstemningsstedadresse, kommunekode, opstillingskreds_dagi_id, ændret, geo_ændret, geo_version, st_asgeojson(geom) as geom_json from afstemningsomraader'))[0];
        assert(temaRow);
        assert.strictEqual(temaRow.dagi_id, '707412');
        assert.strictEqual(temaRow.nummer, 5);
        assert.strictEqual(temaRow.navn, 'Glejbjerg');
        assert.strictEqual(temaRow.afstemningsstednavn, 'Glejbjerg Fritidscenter');
        assert.strictEqual(temaRow.afstemningsstedadresse, '0a3f508e-2896-32b8-e044-0003ba298018');
        assert.strictEqual(temaRow.kommunekode, 575);
        assert.strictEqual(temaRow.opstillingskreds_dagi_id, '403623');
        assert.strictEqual(temaRow.geo_version, 1);
        assert(datetimeRegex.test(temaRow.ændret));
        assert(datetimeRegex.test(temaRow.geo_ændret));
        initialGeom = temaRow.geom_json;
        const geojson = JSON.parse(initialGeom);
        assert.strictEqual('MultiPolygon', geojson.type);
      }));
    }));
    it('Kan opdatere afstemningsområde navn', () => go(function*(){
      const client = clientFn();
      yield withImportTransaction(client, 'dagiToDb', (txid) => go(function*() {
        yield importDagiImpl.importTemaerWfsMulti(client, txid, ['afstemningsområde'], featureMappingsDatafordeler, path.join(__dirname, 'importDagiImplSpec/updated'), '', 1000000);
        const temaRow = (yield client.queryRows('select navn, geo_version, st_asgeojson(geom) as geom_json from afstemningsomraader'))[0];
        assert(temaRow);
        assert.strictEqual(temaRow.navn, 'GlejbjergÆndret');
        assert.strictEqual(temaRow.geo_version, 1);
        assert.strictEqual(initialGeom, temaRow.geom_json);
      }));
    }));
    it('Kan opdatere afstemningsområde geometri', () => go(function*(){
      const client = clientFn();
      yield withImportTransaction(client, 'dagiToDb', (txid) => go(function*() {
        yield importDagiImpl.importTemaerWfsMulti(client, txid, ['afstemningsområde'], featureMappingsDatafordeler, path.join(__dirname, 'importDagiImplSpec/updatedGeom'), '', 1000000);
        const temaRow = (yield client.queryRows('select navn, geo_version, st_asgeojson(geom) as geom_json from afstemningsomraader'))[0];
        assert(temaRow);
        assert.strictEqual(temaRow.navn, 'GlejbjergÆndret');
        assert.strictEqual(temaRow.geo_version, 2);
        assert.notStrictEqual(initialGeom, temaRow.geom_json);

      }));
    }));
    it('Kan importere opstillingskreds', () => go(function*() {
      const client = clientFn();
      yield withImportTransaction(client, 'dagiToDb', (txid) => go(function* () {
        yield importDagiImpl.importTemaerWfsMulti(client, txid, ['opstillingskreds'], featureMappingsDatafordeler, path.join(__dirname, 'importDagiImplSpec/initial'), '', 1000000);
        const temaRow = (yield client.queryRows('select dagi_id, nummer, navn, kode, valgkredsnummer, storkredsnummer, kredskommunekode, ændret, geo_ændret, geo_version, st_asgeojson(geom) as geom_json from opstillingskredse'))[0];
        assert(temaRow);
        assert.strictEqual(temaRow.dagi_id, '403577');
        assert.strictEqual(temaRow.nummer, 26);
        assert.strictEqual(temaRow.kode, 26);
        assert.strictEqual(temaRow.navn, 'Rudersdal');
        assert.strictEqual(temaRow.valgkredsnummer, 6);
        assert.strictEqual(temaRow.storkredsnummer, 3);
        assert.strictEqual(temaRow.kredskommunekode, 230);
        assert(datetimeRegex.test(temaRow.ændret));
        assert(datetimeRegex.test(temaRow.geo_ændret));
        assert.strictEqual(temaRow.geo_version, 1);
        initialGeom = temaRow.geom_json;
        const geojson = JSON.parse(initialGeom);
        assert.strictEqual('MultiPolygon', geojson.type);
      }));
    }));
  });
});

describe('landpostnumre', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('landpostnumre er afgrænset af regioner', () =>go(function*() {
      const areas = (yield clientFn().queryRows(`select (select st_area(geom) from dagi_postnumre where nr = 1050) as postnummerarea, (select st_area(geom) from landpostnumre where nr = 1050) as landpostnummerarea`))[0];
      assert(areas.postnummerarea > areas.landpostnummerarea);
    }));
  });

});
