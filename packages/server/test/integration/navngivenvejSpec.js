"use strict";
const { go } = require('ts-csp');
const {assert} = require('chai');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');

const ID_OMRÅDE = '0e2e13c9-78d0-4751-9f92-bfee3c5a5ad6';

describe.only('NavngivenVej API', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    const getByKeyResource = registry.get({
      entityName: 'navngivenvej',
      type: 'resource',
      qualifier: 'getByKey'
    });

    const queryResource = registry.get({
      entityName: 'navngivenvej',
      type: 'resource',
      qualifier: 'query'
    });
    const autocompleteResource = registry.get({
      entityName: 'navngivenvej',
      type: 'resource',
      qualifier: 'autocomplete'
    });
    it('Hvis jeg henter en navngivenvej med område i stedet for linje, så får jeg null tilbage i geometri-feltet', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), getByKeyResource, {id: ID_OMRÅDE}, {
        format: 'geojson'
      });
      assert.isNull(result.geometry);
    }));
    it(`Hvis jeg henter en navngivenvej med område i stedet for linje, 
    og anvender geometri=vejnavneområde parameteren, 
    så får jeg null tilbage i geometri-feltet`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), getByKeyResource, {id: ID_OMRÅDE}, {
        format: 'geojson',
        geometri: 'vejnavneområde'
      });
      assert.isNotNull(result.geometry);
    }));

    it(`Hvis jeg henter en navngivenvej med område i stedet for linje, 
    og anvender geometri=begge parameteren, 
    så får jeg en polygon tilbage i geometri-feltet`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), getByKeyResource, {id: ID_OMRÅDE}, {
        format: 'geojson',
        geometri: 'vejnavneområde'
      });
      assert.isNotNull(result.geometry);
    }));

    it(`Kan søge efter navngiven vej`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        q: 'engvangsv*'
      });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].navn, 'Engvangsvej');
    }));

    it(`Kan lave fuzzy søgning efter navngiven vej`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        q: 'envangsvej',
        fuzzy: ''
      });
      assert.strictEqual(result[0].navn, 'Engvangsvej');
    }));
    it(`Kan autocomplete navngiven vej`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), autocompleteResource, {}, {
        q: 'engvangsv'
      });
      assert.strictEqual(result[0].tekst, 'Engvangsvej, Kalundborg Kommune');
    }));
    it(`Kan fuzzy autocomplete navngiven vej`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), autocompleteResource, {}, {
        q: 'envangsv',
        fuzzy: ''
      });
      assert.strictEqual(result[0].tekst, 'Engvangsvej, Kalundborg Kommune');
    }));

    it('Nedlagte vejstykker er ikke med hvis medtagnedlagte ikke er angivet', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource,
        {},
        {id: 'c0f08a1a-b9a4-465b-8372-d12babe7fbd6'});
      assert.strictEqual(result.length, 1);
      const vejstykker = result[0].vejstykker;
      const nedlagt = vejstykker.find(vejstykke => vejstykke.darstatus === 4);
      assert(!nedlagt);
    }));
    it('Nedlagte vejstykker er med hvis medtagnedlagte er angivet', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource,
        {},
        {id: 'c0f08a1a-b9a4-465b-8372-d12babe7fbd6', medtagnedlagte: ''});
      assert.strictEqual(result.length, 1);
      const vejstykker = result[0].vejstykker;
      const nedlagt = vejstykker.find(vejstykke => vejstykke.darstatus === 4);
      assert(nedlagt);
    }));

    it('Kan kombinere polygon-søgning med q-parameter i navngivne veje', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource,
        {},
        {q:'Drøsselbjergvej', polygon: '[[[10.18,55.3],[12,55.3],[12,55.6],[12,55.6],[10.18,55.3]]]'});
      assert.strictEqual(result.length, 1);
    }));
  });
});
