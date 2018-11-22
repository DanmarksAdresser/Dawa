"use strict";
const { go } = require('ts-csp');
const {assert} = require('chai');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');

const ID_OMRÅDE = '0e2e13c9-78d0-4751-9f92-bfee3c5a5ad6';

describe('NavngivenVej API', () => {
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
      assert.strictEqual(result[0].tekst, 'Engvangsvej');
    }));
    it(`Kan fuzzy autocomplete navngiven vej`, () => go(function* () {
      const result = yield helpers.getJson(clientFn(), autocompleteResource, {}, {
        q: 'envangsv',
        fuzzy: ''
      });
      assert.strictEqual(result[0].tekst, 'Engvangsvej');
    }));
  });
});
