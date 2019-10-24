"use strict";
const {go} = require('ts-csp');
const {assert} = require('chai');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');

const queryResource = registry.get({
    entityName: `vejnavnpostnummerrelation`,
    type: 'resource',
    qualifier: 'query'
});

const getByKeyResource = registry.get({
    entityName: `vejnavnpostnummerrelation`,
    type: 'resource',
    qualifier: 'getByKey'
});

describe('Vejnavnpostnummerrelation API', () => {
    testdb.withTransactionEach('test', (clientFn) => {
        it('Kan lave polygon soegning', () => go(function* () {
            const result = yield helpers.getJson(clientFn(),
                queryResource,
                {},
                {
                    format: 'geojson',
                    srid: '25832',
                    polygon: '[[[585160.88,6139806.53], [585203.56,6139857.91],[585194.53,6139847.14],[585186.46,6139837.11],[585178.57,6139827.63],[585169.95,6139817.52],[585160.88,6139806.53]]]'
                });
            assert.strictEqual(result.features.length, 1);
        }));
        it('Kan lave reverse geocoding', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), queryResource, {}, {
                srid: '25832',
                x: '725055',
                y: '6166305'
            });
            assert.strictEqual(result.length, 1);
        }));

        it('Kan lave et enkeltopslag', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), getByKeyResource, {
                postnr: '4320',
                vejnavn: 'Hovedvejen'
            }, {});
            assert.strictEqual(result.vejnavn, 'Hovedvejen');
            assert.strictEqual(result.postnummer.nr, '4320');
        }));
        it('Kan lave en soegning', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), queryResource, {},
                {
                    q: 'Hovedvej*'
                });
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].vejnavn, 'Hovedvejen');
            assert.strictEqual(result[0].postnummer.nr, '4320');
        }));
        it('Kan lave en fuzzy soegning', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), queryResource, {},
                {
                    q: 'Hovedvejn 4320',
                    fuzzy: 'true'
                });
            assert(result.length > 1);
            assert.strictEqual(result[0].vejnavn, 'Hovedvejen');
            assert.strictEqual(result[0].postnummer.nr, '4320');
        }));
    });
});
