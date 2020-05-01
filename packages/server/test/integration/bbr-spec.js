"use strict";
const {go} = require('ts-csp');
const {assert} = require('chai');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');

const getQueryResource = entityName => registry.get({
    entityName: `bbr_${entityName}`,
    type: 'resource',
    qualifier: 'query'
});

const getByKeyResource = entityName => registry.get({
    entityName: `bbr_${entityName}`,
    type: 'resource',
    qualifier: 'getByKey'
});

describe ('BBR Grunddata API', () => {
    testdb.withTransactionEach('test', (clientFn) => {
        it('Kan lave enkeltopslag påbygning', () => go(function* () {
            const result = yield helpers.getJson(clientFn(),
                getByKeyResource('bygning'),
                {id: "00058c31-60c7-45d5-9b80-a031270c0034"},
                {});
            assert.strictEqual(result.id, "00058c31-60c7-45d5-9b80-a031270c0034");
            assert.strictEqual(result.href, "http://dawa/bbr/bygninger/00058c31-60c7-45d5-9b80-a031270c0034");
        }));
        it('Kan lave GeoJSON søgning på bygning', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), getQueryResource('bygning'), {}, {
                format: 'geojson',
                per_side: '10'
            });
            assert.isNotNull(result.features[0].geometry);
            assert.strictEqual(result.features[0].geometry.coordinates.length, 2);

        }));
        it('Kan lave GeoJSON søgning på teknisk anlæg', () => go(function* () {
            const result = yield helpers.getJson(clientFn(), getQueryResource('tekniskanlæg'), {}, {
                format: 'geojson',
                per_side: '10'
            });
            assert.isNotNull(result.features[0].geometry);
            assert.strictEqual(result.features[0].geometry.coordinates.length, 2);
        }));
        for(let entityName of ['bygning', 'tekniskanlæg']) {
            it(`Kan lave reverse geocoding på ${entityName}`, () => go(function*() {
                const result = yield helpers.getJson(clientFn(), getQueryResource(entityName), {}, {
                    format: 'geojson',
                    srid: '25832',
                    x: '725055',
                    y: '6166305'
                });
                assert.strictEqual(result.features.length, 1);
            }));
            const expectedPolygonResults = {
                bygning: 193,
                tekniskanlæg: 64
            }
            it(`Kan lave polygon sgning på ${entityName}`, () => go(function*() {
                const result = yield helpers.getJson(clientFn(), getQueryResource(entityName), {}, {
                    format: 'geojson',
                    srid: '25832',
                    polygon: '[[[683890.4,6157621.95], [683890.4,6167652.12], [692020.25,6167652.12], [692020.25,6157621.95], [683890.4,6157621.95]]]'                });
                assert.strictEqual(result.features.length, expectedPolygonResults[entityName]);
            }));
        }
    });
});
