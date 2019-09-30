"use strict";

const{ assert} = require('chai');
const { go } = require('ts-csp');

const registry = require('../../apiSpecification/registry');
const helpers = require('./helpers');
const testdb = require('@dawadk/test-util/src/testdb');
require('../../apiSpecification/allSpecs');

describe('Vejnavne', () => {
    const getByKeyResource = registry.findWhere({entityName: 'vejnavn', qualifier: 'getByKey', 'type': 'resource'});
    assert(getByKeyResource);
    testdb.withTransactionEach('test', (clientFn) => {
        it('Postnumre er unikke', () => go(function*() {
            const result = yield helpers.getJson(clientFn(), getByKeyResource, {navn:'Holbækmotorvejen'}, {});
            assert.deepEqual(result.postnumre, [{
                "href": "http://dawa/postnumre/2640",
                "nr": "2640",
                "navn": "Hedehusene"
            }]);
        }));
        it('Kommuner er unikke', () => go(function*() {
            const result = yield helpers.getJson(clientFn(), getByKeyResource, {navn:'Holbækmotorvejen'}, {});
            const taastrupCount = result.kommuner.filter(kommune => kommune.kode === '0169').length;
            assert.strictEqual(taastrupCount, 1);
        }));
     });
});

