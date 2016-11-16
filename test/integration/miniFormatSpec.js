"use strict";

const expect = require('chai').expect;

const q = require('q');

const testdb = require('../helpers/testdb');
const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');

require('../../apiSpecification/allSpecs');

describe('Mini-format', () => {
  testdb.withTransactionAll('test', clientFn => {
    const adgangsadresseQueryResource = registry.get({
      entityName: 'adgangsadresse',
      type: 'resource',
      qualifier: 'query'
    });

    const adresseQueryResource = registry.get({
      entityName: 'adresse',
      type: 'resource',
      qualifier: 'query'
    });
    it('Skal kunne returnere en adgangsadresse i mini-format', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), adgangsadresseQueryResource, {}, {
        id: '0a3f5081-c2b5-32b8-e044-0003ba298018',
        struktur: 'mini'
      });
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({
        "id": "0a3f5081-c2b5-32b8-e044-0003ba298018",
        "status": 1,
        "vejkode": "0298",
        "vejnavn": "Hovedvejen",
        "husnr": "292",
        "supplerendebynavn": "Boruphuse",
        "postnr": "4320",
        "postnrnavn": "Lejre",
        "kommunekode": "0350",
        "x": 11.9260182210576,
        "y": 55.5382729699298
      });
    }));
    it('Skal kunne returnere en adresse i mini-format', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), adresseQueryResource, {}, {
        id: '0a3f50ab-a7fe-32b8-e044-0003ba298018',
        struktur: 'mini'
      });
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({
        "id": "0a3f50ab-a7fe-32b8-e044-0003ba298018",
        "status": 1,
        "vejkode": "0298",
        "vejnavn": "Hovedvejen",
        "husnr": "292",
        "etage": null,
        "dør": null,
        "supplerendebynavn": "Boruphuse",
        "postnr": 4320,
        "postnrnavn": "Lejre",
        "kommunekode": "0350",
        "adgangsadresseid": "0a3f5081-c2b5-32b8-e044-0003ba298018",
        "x": 11.9260182210576,
        "y": 55.5382729699298
      });
    }));

    it('Skal kunne returnere adgangsadresse i CSV + Mini format', q.async(function*() {
      const result = yield helpers.getCsv(clientFn(), adgangsadresseQueryResource, {}, {
        id: '0a3f5081-c2b5-32b8-e044-0003ba298018',
        struktur: 'mini',
        format: 'csv'
      });
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({
        "id": "0a3f5081-c2b5-32b8-e044-0003ba298018",
        "status": "1",
        "vejkode": "0298",
        "vejnavn": "Hovedvejen",
        "husnr": "292",
        "supplerendebynavn": "Boruphuse",
        "postnr": "4320",
        "postnrnavn": "Lejre",
        "kommunekode": "0350",
        "x": "11.9260182210576",
        "y": "55.5382729699298"
      });
    }));

    it('Skal kunne returnere en adresse i CSV + mini format', q.async(function*() {
      const result = yield helpers.getCsv(clientFn(), adresseQueryResource, {}, {
        id: '0a3f50ab-a7fe-32b8-e044-0003ba298018',
        struktur: 'mini',
        format: 'csv'
      });
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({
        "id": "0a3f50ab-a7fe-32b8-e044-0003ba298018",
        "status": "1",
        "vejkode": "0298",
        "vejnavn": "Hovedvejen",
        "husnr": "292",
        "etage": "",
        "dør": "",
        "supplerendebynavn": "Boruphuse",
        "postnr": "4320",
        "postnrnavn": "Lejre",
        "kommunekode": "0350",
        "adgangsadresseid": "0a3f5081-c2b5-32b8-e044-0003ba298018",
        "x": "11.9260182210576",
        "y": "55.5382729699298"
      });
    }));

    it('Skal kunne returnere adgangsadresse i GeoJSON+mini format', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), adgangsadresseQueryResource, {}, {
        id: '0a3f5081-c2b5-32b8-e044-0003ba298018',
        struktur: 'mini',
        format: 'geojson'
      });
      expect(result.features).to.have.length(1);
      const feature = result.features[0];
      expect(feature).to.deep.equal({
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            11.9260182210576,
            55.5382729699298
          ]
        },
        "properties": {
          "id": "0a3f5081-c2b5-32b8-e044-0003ba298018",
          "status": 1,
          "vejkode": "0298",
          "vejnavn": "Hovedvejen",
          "husnr": "292",
          "supplerendebynavn": "Boruphuse",
          "postnr": "4320",
          "postnrnavn": "Lejre",
          "kommunekode": "0350"
        }
      });
    }));

    it('Skal kunne returnere adresse i GeoJSON+mini format', q.async(function*() {
      const result = yield helpers.getJson(clientFn(), adresseQueryResource, {}, {
        id: '0a3f50ab-a7fe-32b8-e044-0003ba298018',
        struktur: 'mini',
        format: 'geojson'
      });
      expect(result.features).to.have.length(1);
      const feature = result.features[0];
      expect(feature).to.deep.equal({
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            11.9260182210576,
            55.5382729699298
          ]
        },
        "properties": {
          "id": "0a3f50ab-a7fe-32b8-e044-0003ba298018",
          "status": 1,
          "vejkode": "0298",
          "vejnavn": "Hovedvejen",
          "husnr": "292",
          "etage": null,
          "dør": null,
          "supplerendebynavn": "Boruphuse",
          "postnr": 4320,
          "postnrnavn": "Lejre",
          "kommunekode": "0350",
          "adgangsadresseid": "0a3f5081-c2b5-32b8-e044-0003ba298018"
        }
      });
    }));
  });
});
