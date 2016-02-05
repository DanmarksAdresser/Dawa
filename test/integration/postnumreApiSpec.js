"use strict";

var expect = require('chai').expect;
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

  it('Jeg kan hente stormodtagerpostnumre', function(done) {
    request.get({url: "http://localhost:3002/postnumre?stormodtagere=true", json: true}, function(error, response, result) {
      var fandtStormodtager = _.some(result, function(postnummer) {
        return _.isArray(postnummer.stormodtageradresser) && postnummer.stormodtageradresser.length > 0;
      });
      expect(fandtStormodtager).to.be.true;
      done();
    });
  });
  it('Jeg kan hente et enkelt stormodtagerpostnummer', function(done) {
    request.get({url: "http://localhost:3002/postnumre/1786", json: true}, function(error, response, result) {
      expect(result.nr).to.equal('1786');
      done();
    });
  });

});
