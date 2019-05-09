"use strict";

const {go} = require('ts-csp');
const {assert, expect} = require('chai');
const request = require("request-promise");
const _ = require('underscore');

const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

const kommuner = [
  {href: `${baseUrl}/kommuner/0253`, kode: "0253", navn: 'Greve'},
  {href: `${baseUrl}/kommuner/0269`, kode: "0269", navn: 'Solrød'}];


describe("PostnumreApi", function () {
  it("It is possible to get a single postnummer", function () {
    return request.get({url: `${baseUrl}/postnumre/2690`, json: true}).then(function (result) {
      expect(result.nr).to.equal("2690");
      expect(result.navn).to.equal("Karlslunde");
      expect(result.kommuner).to.deep.equal(kommuner);
    });
  });
  it("It is possible to autocomplete a postnummer", function (done) {
    request.get({
      url: `${baseUrl}/postnumre/autocomplete?q=Karls`,
      json: true
    }, function (error, response, result) {
      const suggestion = result[0];
      expect(suggestion.tekst).to.equal('2690 Karlslunde');
      expect(suggestion.postnummer.nr).to.equal("2690");
      done();
    });
  });

  it('It is possible to search for postnumre', function (done) {
    request.get({
      url: `${baseUrl}/postnumre?q=karlslunde`,
      json: true
    }, function (error, response, result) {
      const postnummer = result[0];
      expect(postnummer.nr).to.equal("2690");
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });

  it('It is possible to search for postnumre by name', function (done) {
    request.get({
      url: `${baseUrl}/postnumre?navn=Karlslunde`,
      json: true
    }, function (error, response, result) {
      const postnummer = result[0];
      expect(postnummer.nr).to.equal("2690");
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });
  it('It is possible to search for postnumre by kommunekode', function (done) {
    request.get({
      url: `${baseUrl}/postnumre?kommune=253`,
      json: true
    }, function (error, response, result) {
      const postnummer = _.findWhere(result, {nr: "2690"});
      expect(postnummer.nr).to.exist;
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });

  it('Kan hente stormodtagerpostnumre', function (done) {
    request.get({
      url: `${baseUrl}/postnumre?stormodtagere=true`,
      json: true
    }, function (error, response, result) {
      const fandtStormodtager = _.some(result, function (postnummer) {
        return _.isArray(postnummer.stormodtageradresser) && postnummer.stormodtageradresser.length > 0;
      });
      expect(fandtStormodtager).to.be.true;
      done();
    });
  });
  it('Kan hente et enkelt stormodtagerpostnummer', () => go(function* () {
    const result = yield request.get({url: `${baseUrl}/postnumre/1786`, json: true});
    assert.strictEqual(result.nr, '1786');
  }));

  it('Kan hente kystafgrænsede postnumre', () => go(function* () {
    const ikkeAfgrænset = yield request.get({
      url: `${baseUrl}/postnumre/8000?format=geojson&srid=25832`,
      json: true
    });
    const afgrænset = yield request.get({
      url: `${baseUrl}/postnumre/8000?format=geojson&landpostnumre&srid=25832`,
      json: true
    });
    assert.deepEqual(ikkeAfgrænset.geometry.coordinates, [[[[725025, 6166300], [725040, 6166300], [725040, 6166310], [725025, 6166310], [725025, 6166300]]]]);
    assert.deepEqual(afgrænset.geometry.coordinates, [[[[725030, 6166300], [725025, 6166300], [725025, 6166310], [725030, 6166310], [725030, 6166300]]]]);
  }));

  it('Stormodtagerpostnummer har kommune', () => go(function* () {
    const postnummer = yield request.get({url: `${baseUrl}/postnumre/0800`, json: true});
    assert.strictEqual(postnummer.kommuner.length, 1);
  }));
});
