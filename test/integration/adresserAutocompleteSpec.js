"use strict";

var request = require("request");
var _       = require("underscore");

describe('Autocomplete af adresser', function() {
  it('Should be possible to autocomplete an address', function(done) {
    request.get({url: 'http://localhost:3002/adresser/autocomplete?q=lUna', json: true}, function(error, response, result) {
      expect(response.statusCode).toEqual(200);
      expect(_.isArray(result)).toBe(true);
      var suggestion = result[0];
      expect(suggestion).toBeDefined();
      expect(suggestion.tekst).toBeDefined();
      expect(suggestion.tekst).toMatch(/Lunavej/);
      expect(suggestion.adresse).toBeDefined();
      done();
    });
  });
  it('Should default to a value of 20 for per_side parameter', function(done) {
    request.get({url: 'http://localhost:3002/adresser/autocomplete?q=1', json: true}, function(error, response, result) {
      expect(result.length).toBe(20);
      done();
    });
  });

  it('Should accept filtering parameter', function(done) {
    request.get({url: 'http://localhost:3002/adresser/autocomplete?q=luna&husnr=3', json: true}, function(error, response, result) {
      expect(result.length).toBe(1);
      done();
    });
  });

  it('Suggestions should include a valid link id and href for adresse', function(done) {
    request.get({url: 'http://localhost:3002/adresser/autocomplete?q=si', json: true}, function(error, response, result) {
      var suggestion = result[0];
      var id = suggestion.adresse.id;
      var href = suggestion.adresse.href;
      expect(href).toMatch(new RegExp(id));
      request.get(href, function(error, response, body) {
        expect(response.statusCode).toBe(200);
        done();
      });
    });
  });
});
