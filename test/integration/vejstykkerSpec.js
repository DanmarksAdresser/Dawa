"use strict";

const expect = require('chai').expect;
const q = require('q');

const helpers = require('./helpers');
const resources = require('../../apiSpecification/vejstykke/resources');
const testdb = require('../helpers/testdb');

describe('Vejstykker', () => {
  const queryResource = resources.query;
  const naboResource = resources.neighbors;
  testdb.withTransactionEach('test', (clientFn) => {
    it('Kan finde vejstykker med fuzzy søgning', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {q: 'elliasgade', fuzzy: ''});
      expect(result).to.not.be.empty;
      expect(result[0].navn).to.equal('Eliasgade');
    }));
    it('Kan finde vejstykker ud fra regulært udtryk', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), queryResource, [], {regex: 'marken'});
      expect(result).to.have.length(2);
      const names = new Set(result.map(result => result.navn));
      expect(names.has('Strandmarken')).to.be.true;
      expect(names.has('Nedermarken')).to.be.true;
    }));

    describe('/vejstykker/{kommunekode}/{kode}/naboer', () => {
      it('Kan finde naboer som støder direkte op til vejstykke', q.async(function*() {
        const result = yield helpers.getJson(clientFn(), naboResource, {kommunekode: '329', kode: '4317'}, {});
        expect(result).to.have.length(2);
        const names = new Set(result.map(result => result.navn));
        expect(names.has('Langebjergvej')).to.be.true;
        expect(names.has('Skeevej')).to.be.true;
      }));
      it('Kan finde naboer i GeoJSON format', q.async(function*() {
        const result = yield helpers.getJson(clientFn(), naboResource, {kommunekode: '329', kode: '4317'}, {format: 'geojson'});
        expect(result.features).to.have.length(2);
      }));
    });
  });
});

