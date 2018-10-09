"use strict";

const{ assert} = require('chai');
const { go } = require('ts-csp');

const helpers = require('./helpers');
const bygningResources = require('../../apiSpecification/bygning/resources');
const testdb = require('../helpers/testdb2');

describe('Bygninger API', () => {
  const queryResource = bygningResources.query;
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan hente bygninger i geojson format', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        format: 'geojson'
      });
      const features = result.features;
      assert(features.length > 0);
    }));
    it('Kan lave reverse geocoding', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        x: '11.92618321',y:'55.53862219'
      });
      assert(result.length === 1);
      const bygning = result[0];
      assert.strictEqual(bygning.id, "1057443037");
    }));

    it('Kan finde nærmeste bygning med reverse geocoding', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        x: '10.19187927246094',y:'56.13713314002935', nærmeste: ''
      });
      assert(result.length === 1);
      const bygning = result[0];
      assert.strictEqual(bygning.id, '1034537171');
    }));
    it('Kan finde bygninger indenfor polygon', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
       polygon: '[[[12.66034124,55.59696304],[12.66046685,55.59695623],[12.66048691,55.59707253],[12.66036129,55.59707934],[12.66034124,55.59696304]]]'
      });
      assert(result.length === 1);
      const bygning = result[0];
      assert.strictEqual(bygning.id, '1005260612');
    }));
  });
});
