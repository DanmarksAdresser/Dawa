"use strict";

const { go } = require('ts-csp');
var expect = require('chai').expect;
var request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe('Autocomplete af adresser', function() {
  it('Should be possible to autocomplete an address', () => go(function* () {
    const response = yield request.get({
      url: `${baseUrl}/adresser/autocomplete?q=lUna`,
      json: true
    });
    const suggestion = response[0];
    expect(suggestion).to.exist;
    expect(suggestion.tekst).to.exist;
    expect(suggestion.tekst).to.match(/Lunavej/);
    expect(suggestion.adresse).to.exist;
  }));
  it('Should default to a value of 20 for per_side parameter', function(done) {
    request.get({url: `${baseUrl}/adresser/autocomplete?q=1`, json: true}, function(error, response, result) {
      expect(result.length).to.equal(20);
      done();
    });
  });

  it('Should accept filtering parameter', function(done) {
    request.get({url: `${baseUrl}/adresser/autocomplete?q=luna&husnr=3`, json: true}, function(error, response, result) {
      expect(result.length).to.equal(1);
      done();
    });
  });

  it('Suggestions should include a valid link id and href for adresse', function(done) {
    request.get({url: `${baseUrl}/adresser/autocomplete?q=si`, json: true}, function(error, response, result) {
      var suggestion = result[0];
      var id = suggestion.adresse.id;
      var href = suggestion.adresse.href;
      expect(href).to.match(new RegExp(id));
      request.get(href, function(error, response) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
});
