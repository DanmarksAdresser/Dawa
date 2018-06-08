"use strict";

const { go } = require('ts-csp');
var {assert, expect} = require('chai');
var request = require("request-promise");
var _ = require('underscore');

var kommuner = [ { href : 'http://localhost:3002/kommuner/0253', kode : "0253", navn : 'Greve' },
                 { href : 'http://localhost:3002/kommuner/0269', kode : "0269", navn : 'Solrød' } ];

describe("PostnumreApi", function() {
  it("It is possible to get a single postnummer", function() {
    return request.get({url: "http://localhost:3002/postnumre/2690", json: true}).then(function(result) {
      expect(result.nr).to.equal("2690");
      expect(result.navn).to.equal("Karlslunde");
      expect(result.kommuner).to.deep.equal(kommuner);
    });
  });
  it("It is possible to autocomplete a postnummer", function(done) {
    request.get({url: "http://localhost:3002/postnumre/autocomplete?q=Karls", json: true}, function(error, response, result) {
      var suggestion = result[0];
      expect(suggestion.tekst).to.equal('2690 Karlslunde');
      expect(suggestion.postnummer.nr).to.equal("2690");
      done();
    });
  });

  it('It is possible to search for postnumre', function(done) {
    request.get({url: "http://localhost:3002/postnumre?q=karlslunde", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).to.equal("2690");
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });

  it('It is possible to search for postnumre by name', function(done) {
    request.get({url: "http://localhost:3002/postnumre?navn=Karlslunde", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).to.equal("2690");
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });
  it('It is possible to search for postnumre by kommunekode', function(done) {
    request.get({url: "http://localhost:3002/postnumre?kommune=253", json: true}, function(error, response, result) {
      var postnummer = _.findWhere(result, {nr: "2690"});
      expect(postnummer.nr).to.exist;
      expect(postnummer.navn).to.equal('Karlslunde');
      expect(postnummer.kommuner).to.deep.equal(kommuner);
      done();
    });
  });

  it('Kan hente stormodtagerpostnumre', function(done) {
    request.get({url: "http://localhost:3002/postnumre?stormodtagere=true", json: true}, function(error, response, result) {
      var fandtStormodtager = _.some(result, function(postnummer) {
        return _.isArray(postnummer.stormodtageradresser) && postnummer.stormodtageradresser.length > 0;
      });
      expect(fandtStormodtager).to.be.true;
      done();
    });
  });
  it('Kan hente et enkelt stormodtagerpostnummer', () => go(function* () {
    const result = yield request.get({url: "http://localhost:3002/postnumre/1786", json: true});
    assert.strictEqual(result.nr, '1786');
  }));

  it('Kan hente kystafgrænsede postnumre', () => go(function*() {
    const ikkeAfgrænset = yield request.get({url: 'http://localhost:3002/postnumre/8000?format=geojson&srid=25832', json: true});
    const afgrænset = yield request.get({url: 'http://localhost:3002/postnumre/8000?format=geojson&landpostnumre&srid=25832', json: true});
    assert.deepEqual(ikkeAfgrænset.geometry.coordinates, [[[[725025,6166300],[725040,6166300],[725040,6166310],[725025,6166310],[725025,6166300]]]]);
    assert.deepEqual(afgrænset.geometry.coordinates, [[[[725030,6166300],[725025,6166300],[725025,6166310],[725030,6166310],[725030,6166300]]]]);
  }));

});
