"use strict";
const { go } = require('ts-csp');
const {assert} = require('chai');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('../helpers/testdb2');

require('../../apiSpecification/allSpecs');

const ID_OMRÅDE = '0e2e13c9-78d0-4751-9f92-bfee3c5a5ad6';

describe('NavngivenVej API', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    const getByKeyResource = registry.get({
      entityName: 'navngivenvej',
      type: 'resource',
      qualifier: 'getByKey'
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
  });
});