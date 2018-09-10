"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');
const testdb = require('../helpers/testdb2');
const registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

const helpers = require('./helpers');
const udtraekHandler = registry.findWhere({
  entityName: 'replikering',
  type: 'httpHandler',
  qualifier: 'udtræk'
});

assert(udtraekHandler);
describe('Opslag på replikerings-API', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan lave opslag på husnummer-historik udtræk ud fra ID', () => go(function*() {
      const result = yield helpers.getJsonFromHandler(clientFn(), udtraekHandler.responseHandler, {}, {
        entitet: 'dar_husnummer_historik',
        id: '04b3fd1d-48f0-4f80-89df-88b322a84f23'});
      assert.strictEqual(result.length, 4);
      for(let row of result) {
        assert.strictEqual(row.id, '04b3fd1d-48f0-4f80-89df-88b322a84f23');
      }
    }));
  });
});