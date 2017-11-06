"use strict";

const assert = require('chai').assert;
const path = require('path');
const {go} = require('ts-csp');

const helpers = require('./helpers');
const importStednavneImpl = require('../../stednavne/importStednavneImpl');
const {withImportTransaction} = require('../../importUtil/importUtil');
const testdb = require('../helpers/testdb2');
const registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');


describe('Import af stednavne', () => {
  testdb.withTransactionAll('empty', clientFn => {
    it('Kan importere en initiel stednavnefil', () => go(function* () {
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

    it('Har udfyldt stednavne_divided', () => go(function* () {
      const rows = (yield clientFn().query('select * from stednavne_divided')).rows;
      assert.strictEqual(rows.length, 2);
    }));


    it('Kan opdatere stednavn', () => go(function* () {
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

    it('Har opdateret stednavne_divided', () => go(function* () {
      const rows = yield clientFn().queryRows('select * from stednavne_divided');
      assert.strictEqual(rows.length, 1);
    }));

  });

  testdb.withTransactionEach('test', clientFn => {
    const queryResource = registry.get({
      entityName: 'stednavn',
      type: 'resource',
      qualifier: 'query'
    });
    const autocompleteResource = registry.get({
      entityName: 'stednavn',
      type: 'resource',
      qualifier: 'autocomplete'
    });

    it('Stednavn er udfyldt med kommune', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        id: '19e4392f-c7b1-5d41-0000-d380220a2006'
      });
      assert.strictEqual(result[0].kommuner.length, 1);
    }));

    it('Kan søge med autocomplete', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), autocompleteResource, {}, {
        q: 'test'
      });
      assert.strictEqual(result.length, 1);
      const match = result[0];
      assert.strictEqual(match.navn, 'Test stednavn punkt');
    }));

    it('Kan finde stednavne med fuzzy søgning', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        q: 'tst stenan pkt',
        fuzzy: 'true'
      });
      assert(result.length > 0);
      const match = result[0];
      assert.strictEqual(match.navn, 'Test stednavn punkt');
    }));

    it('Kan hente stednavn i geojson og srid 25832', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        id: '19e4392f-c7b1-5d41-0000-d380220a2006',
        format: 'geojson',
        srid: '25832'
      });
      const feature = result.features[0];
      assert.strictEqual(feature.geometry.coordinates[0], 725021);
      assert.strictEqual(feature.geometry.coordinates[1], 6166301);


      assert.strictEqual(feature.properties.visueltcenter_x, 725021);
      assert.strictEqual(feature.properties.visueltcenter_y, 6166301);
    }));

    it('Kan finde adgangsadresser ud fra stednavn id', () => go(function*() {
      const adgadrResource = registry.get({
        entityName: 'adgangsadresse',
        type: 'resource',
        qualifier: 'query'
      });
      const result = yield helpers.getJson(clientFn(), adgadrResource, {}, {
        stednavnid: '12337669-8e23-6b98-e053-d480220a5a3f',
        struktur: 'mini'
      });
      assert.strictEqual(result.length, 2);
    }));

    it('Kan finde adgangsadresser indenfor en bestemt afstand fra stednavn', () => go(function*() {
      const adgadrResource = registry.get({
        entityName: 'adgangsadresse',
        type: 'resource',
        qualifier: 'query'
      });
      const result = yield helpers.getJson(clientFn(), adgadrResource, {}, {
        stednavnid: '12337669-8e23-6b98-e053-d480220a5a3f',
        struktur: 'mini',
        stednavnafstand: '1000.1'
      });
      assert.strictEqual(result.length, 3);
    }));
    it('Kan finde adresser indenfor en bestemt afstand fra stednavn', () => go(function*() {
      const adrResource = registry.get({
        entityName: 'adresse',
        type: 'resource',
        qualifier: 'query'
      });
      const result = yield helpers.getJson(clientFn(), adrResource, {}, {
        stednavnid: '12337669-8e23-6b98-e053-d480220a5a3f',
        struktur: 'mini',
        stednavnafstand: '1000.1'
      });
      assert.strictEqual(result.length, 3);
    }));
  });
});
