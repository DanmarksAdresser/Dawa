"use strict";

const{ assert} = require('chai');
const { go } = require('ts-csp');

const helpers = require('./helpers');
const resources = require('../../apiSpecification/temaer/resources')['supplerendebynavn'];
const queryResource = resources[0];
const testdb = require('@dawadk/test-util/src/testdb');
describe('Supplerendebynavn', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan modtage nedlagte supplerende bynavne', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [],
        {medtagnedlagte: '', dagi_id: '669471'});
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].navn, 'Korsør');
    }));
    it('Nedlagte bynavne er ikke med i svar', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [],
        {dagi_id: '669471'});
      assert.strictEqual(result.length, 0);
    }));
  });
});

