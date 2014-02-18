"use strict";

var request = require("request");
//var _       = require("underscore");

describe("PostnumreApi", function() {
  it("It is possible to get a single postnummer", function(done) {
    request.get({url: "http://localhost:3000/postnumre/8600", json: true}, function(error, response, result) {
      expect(result.nr).toBe(8600);
      expect(result.navn).toBe("Silkeborg");
      expect(result.kommuner).toEqual([{ href : 'http://dawa.aws.dk/kommuner/740', kode : 740, navn : 'Silkeborg' }]);
      done();
    });
  });
  it("It is possible to autocomplete a postnummer", function(done) {
    request.get({url: "http://localhost:3000/postnumre/autocomplete?q=silkeb", json: true}, function(error, response, result) {
      var suggestion = result[0];
      expect(suggestion.tekst).toBe('8600 Silkeborg');
      expect(suggestion.postnummer.nr).toBe(8600);
      done();
    });
  });

  it('It is possible to search for postnumre', function(done) {
    request.get({url: "http://localhost:3000/postnumre?q=silkeborg", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe(8600);
      expect(postnummer.navn).toBe('Silkeborg');
      expect(postnummer.kommuner).toEqual([{ href : 'http://dawa.aws.dk/kommuner/740', kode : 740, navn : 'Silkeborg' }]);
      done();
    });
  });

  it('It is possible to search for postnumre by name', function(done) {
    request.get({url: "http://localhost:3000/postnumre?navn=Silkeborg", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe(8600);
      expect(postnummer.navn).toBe('Silkeborg');
      expect(postnummer.kommuner).toEqual([{ href : 'http://dawa.aws.dk/kommuner/740', kode : 740, navn : 'Silkeborg' }]);
      done();
    });
  });

  it('It is possible to search for postnumre by kommunekode', function(done) {
    request.get({url: "http://localhost:3000/postnumre?kommune=740", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe(8600);
      expect(postnummer.navn).toBe('Silkeborg');
      expect(postnummer.kommuner).toEqual([{ href : 'http://dawa.aws.dk/kommuner/740', kode : 740, navn : 'Silkeborg' }]);
      done();
    });
  });

});
