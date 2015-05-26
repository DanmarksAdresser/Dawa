"use strict";

var expect = require('chai').expect;
var q = require('q');
var request = require("request-promise");


describe('Reverse geocoding', function () {
  function getJson(uri) {
    return request.get({uri: uri, resolveWithFullResponse: true}).then(function(response) {
      if(response.statusCode !== 200) {
        return q.reject("Unexpected status code");
      }
      return JSON.parse(response.body);
    });
  }
  ['postnumre', 'kommuner', 'regioner'].forEach(function(entityPlural) {
    it('Skal kunne lave reverse geocoding opslag på ' + entityPlural, function() {
      return getJson("http://localhost:3002/" + entityPlural + "/reverse?x=725025&y=6166305&srid=25832");
    });
    it('Hvis punktet ligger udenfor temaet skal der returneres en 404', function() {
      return request.get(
        {
          uri: "http://localhost:3002/" + entityPlural + "/reverse?x=725035&y=6166305&srid=25832",
          resolveWithFullResponse: true,
          simple: false
        }
      ).then(function(response) {
        expect(response.statusCode).to.equal(404);
      });
    });
    it('Hvis en parameter udelades skal returneres en fejlkode 400', function() {
      return request.get(
        {
          uri: "http://localhost:3002/" + entityPlural + "/reverse?y=59",
          resolveWithFullResponse: true,
          simple: false
        }
      ).then(function(response) {
        expect(response.statusCode).to.equal(400);
      });
    });
  });

  it('Skal kunne lave reverse geocoding paa adgangsadresse', function() {
    return getJson("http://localhost:3002/adgangsadresser/reverse?x=750000&y=6100000&srid=25832").then(function(body) {
      expect(body.id).to.exist;
    });
  });

});