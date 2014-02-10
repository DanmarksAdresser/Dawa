"use strict";

var request = require("request");
//var _       = require("underscore");

describe("PostnumreApi", function() {
  it("It is possible to get a single postnummer", function(done) {
    request.get({url: "http://localhost:3000/api/pg/postnumre/8600", json: true}, function(error, response, result) {
      expect(result.nr).toBe('8600');
      expect(result.navn).toBe("Silkeborg");
      done();
    });
  });
  it("It is possible to autocomplete a postnummer", function(done) {
    request.get({url: "http://localhost:3000/api/pg/postnumre/autocomplete?q=silkeb", json: true}, function(error, response, result) {
      var suggestion = result[0];
      expect(suggestion.tekst).toBe('8600 Silkeborg');
      expect(suggestion.postnummer.nr).toBe('8600');
      done();
    });
  });

  it('It is possible to search for postnumre', function(done) {
    request.get({url: "http://localhost:3000/api/pg/postnumre?q=viby", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe('8600');
      expect(postnummer.navn).toBe('Silkeborg');
      done();
    });
  });

  it('It is possible to search for postnumre by name', function(done) {
    request.get({url: "http://localhost:3000/api/pg/postnumre?navn=Silkeborg", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe('8600');
      expect(postnummer.navn).toBe('Silkeborg');
      done();
    });
  });

});
