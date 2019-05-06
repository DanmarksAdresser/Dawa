"use strict";

const{ assert, expect} = require('chai');
const { go } = require('ts-csp');

const helpers = require('./helpers');
const resources = require('../../apiSpecification/vejstykke/resources');
const testdb = require('@dawadk/test-util/src/testdb');

describe('Vejstykker', () => {
  const queryResource = resources.query;
  const naboResource = resources.neighbors;
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan finde vejstykker med fuzzy søgning', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {q: 'elliasgade', fuzzy: ''});
      expect(result).to.not.be.empty;
      expect(result[0].navn).to.equal('Eliasgade');
    }));
    it('Kan finde vejstykker ud fra regulært udtryk', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {regex: 'marken'});
      expect(result).to.have.length(2);
      const names = new Set(result.map(result => result.navn));
      expect(names.has('Strandmarken')).to.be.true;
      expect(names.has('Nedermarken')).to.be.true;
    }));

    it('Nedlagte vejstykker er ikke med i svar', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {kommunekode: '169', kode: '1'});
      assert.strictEqual(result.length, 0);
    }));

    it('Nedlagte vejstykker er med i svar hvis medtagnedlagte parameter angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {kommunekode: '169', kode: '1', medtagnedlagte: ''});
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].darstatus, 4);
    }));

    describe('/vejstykker/{kommunekode}/{kode}/naboer', () => {
      it('Kan finde naboer som støder direkte op til vejstykke', () => go(function*() {
        const result = yield helpers.getJson(clientFn(), naboResource, {kommunekode: '329', kode: '4317'}, {});
        expect(result).to.have.length(2);
        const names = new Set(result.map(result => result.navn));
        expect(names.has('Langebjergvej')).to.be.true;
        expect(names.has('Skeevej')).to.be.true;
      }));
      it('Kan finde naboer i GeoJSON format', () => go(function*() {
        const result = yield helpers.getJson(clientFn(), naboResource, {kommunekode: '329', kode: '4317'}, {format: 'geojson'});
        expect(result.features).to.have.length(2);
      }));
    });

    describe('/vejstykker/reverse', () => go(function*(){
      const result = yield helpers.getJson(clientFn(), naboResource, {
        x:12.510814300000002, y:55.69837060000
        }, {});
      assert.strictEqual(result.kode, '6100');
    }));
  });
});

