"use strict";

const { go } = require('ts-csp');
const assert = require('chai').assert;
const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('../helpers/testdb2');

require('../../apiSpecification/allSpecs');

describe('adgangsadresse API', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    it('Reverse geocoding respekterer geometri-parameteren', () => go(function*() {
      const resource = registry.get({
        entityName: 'adgangsadresse',
        type: 'resource',
        qualifier: 'reverseGeocoding'
      });
      let vejpunktResult = yield helpers.getJson(clientFn(), resource, {}, {
        geometri: 'vejpunkt',
        x: "12.275016",
        y: "55.566827"
      });
      assert.strictEqual(vejpunktResult.id, '0a3f5081-3b27-32b8-e044-0003ba298018');
      let adgangspunktResult = yield helpers.getJson(clientFn(), resource, {}, {
        x: "12.275016",
        y: "55.566827"
      });
      assert.strictEqual(adgangspunktResult.id, '0a3f5081-3b31-32b8-e044-0003ba298018');
    }));
  });
});
