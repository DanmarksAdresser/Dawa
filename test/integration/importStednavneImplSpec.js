"use strict";

const assert = require('chai').assert;
const path = require('path');
const {go} = require('ts-csp');

const importStednavneImpl = require('../../stednavne/importStednavneImpl');
const {withImportTransaction} = require('../../importUtil/importUtil');
const testdb = require('../helpers/testdb2');

describe('Import af stednavne', () => {
  testdb.withTransactionAll('empty', clientFn => {
    it('Kan importere en initiel stednavnefil', () => go(function*() {
      const client = clientFn();
      yield withImportTransaction(client, 'importStednavne',
        txid => importStednavneImpl.importStednavne(
          client,
          txid,
          path.join(__dirname, 'stednavnedata', 'udtraek1.json')));
      const stednavne = (yield client.query('select id, geo_version, navn, hovedtype, undertype, navnestatus, st_asgeojson(geom) as geom from stednavne')).rows;
      assert.strictEqual(stednavne.length, 1);
      const stednavn = stednavne[0];
      assert.strictEqual(stednavn.id, '1233766a-103b-6b98-e053-d480220a5a3f');
      assert.strictEqual(stednavn.navn, 'Klippeløkken');
      assert.strictEqual(stednavn.navnestatus, 'officielt');
      assert.strictEqual(stednavn.hovedtype, 'Andentopografi flade');
      assert.strictEqual(stednavn.undertype, 'stenbrud');
      const geojson = JSON.parse(stednavn.geom);
      assert.strictEqual(geojson.type, 'Polygon');
      assert.strictEqual(geojson.coordinates.length, 1);
      assert.strictEqual(geojson.coordinates[0].length, 68);
      assert.deepEqual(geojson.coordinates[0][0], [865774.59, 6122368.7])
      assert.strictEqual(stednavn.geo_version, 1);
    }));

    it('Har udfyldt stednavne_divided', () => go(function*() {
      const rows = (yield clientFn().query('select * from stednavne_divided')).rows;
      assert.strictEqual(rows.length, 2);
    }));


    it('Kan opdatere stednavn', () => go(function*() {
      const client = clientFn();
      yield withImportTransaction(client, 'importStednavne',
        txid => importStednavneImpl.importStednavne(
          client,
          txid,
          path.join(__dirname, 'stednavnedata', 'udtraek2.json')));
      const stednavne = (yield client.query('select id, geo_version, navn, hovedtype, undertype, navnestatus, st_asgeojson(geom) as geom from stednavne')).rows;
      assert.strictEqual(stednavne.length, 1);
      const stednavn = stednavne[0];
      assert.strictEqual(stednavn.id, '1233766a-103b-6b98-e053-d480220a5a3f');
      assert.strictEqual(stednavn.navn, 'Skærvebakken');
      assert.strictEqual(stednavn.navnestatus, 'uofficielt');
      assert.strictEqual(stednavn.hovedtype, 'Test');
      assert.strictEqual(stednavn.undertype, 'benbrud');
      const geojson = JSON.parse(stednavn.geom);
      assert.strictEqual(geojson.type, 'Point');
      assert.deepEqual(geojson.coordinates, [865774.59, 6122368.7])
      assert.strictEqual(stednavn.geo_version, 2);
    }));

    it('Har opdateret stednavne_divided', () => go(function*() {
      const rows = (yield clientFn().query('select * from stednavne_divided')).rows;
      assert.strictEqual(rows.length, 1);
    }));
  });
});
