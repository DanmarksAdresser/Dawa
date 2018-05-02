"use strict";

const{ assert} = require('chai');
const { go } = require('ts-csp');

const helpers = require('./helpers');
const stedResources = require('../../apiSpecification/sted/resources');
const stednavnResources = require('../../apiSpecification/stednavn/resources');
const testdb = require('../helpers/testdb2');

describe('Sted API', () => {
  const queryResource = stedResources.query;
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan hente steder i geojson format', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        format: 'geojson'
      });
      const features = result.features;
      assert(features.length > 0);
    }));
    it('Kan lave reverse geocoding', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        x: '10.19187927246094',y:'56.13713314002935'
      });
      assert(result.length === 1);
      const sted = result[0];
      assert.strictEqual(sted.primærtnavn, 'Aarhus');
    }));
    it('Kan lave reverse geocoding med srid 25832', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        x: '574069.4531614',y:'6221982.06594698', srid: '25832'
      });
      assert(result.length === 1);
      const sted = result[0];
      assert.strictEqual(sted.primærtnavn, 'Aarhus');
    }));

  });
});

describe('Stednavn2 API', () => {
  const queryResource = stednavnResources.query;
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan finde stednavn via søgning', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {
      }, {
        q: 'Aarhus'
      });
      assert(result.length === 1);
      const stednavn = result[0];
      assert.strictEqual(stednavn.navn, 'Aarhus');
    }));
    it('Kan finde stednavn via fuzzy søgning', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, {}, {
        q: 'aahrus',
        fuzzy: ''
      });
      assert(result.length > 1);
      const stednavn = result[0];
      assert.strictEqual(stednavn.navn, 'Aarhus');
    }));
  });
});

