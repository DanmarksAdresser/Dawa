"use strict";

var request = require("request");


describe('Reverse geocoding', function () {
  function getJson(uri, cb) {
    request.get(uri, function(error, response, body) {
      if(error) throw error;
      expect(response.statusCode).toBe(200);
      cb(JSON.parse(body));
    });
  }
  ['postnumre', 'kommuner', 'regioner'].forEach(function(entityPlural) {
    it('Skal kunne lave reverse geocoding opslag på ' + entityPlural, function(done) {
      getJson("http://localhost:3002/" + entityPlural + "/reverse?x=61&y=61&srid=25832", function(body) {
        expect(body).toBeDefined();
        done();
      });
    });
    it('Hvis punktet ligger udenfor temaet skal der returneres en 404', function(done) {
      request.get("http://localhost:3002/" + entityPlural + "/reverse?x=59&y=59&srid=25832", function(error, response, body) {
        if(error) throw error;
        expect(response.statusCode).toBe(404);
        done();
      });
    });
    it('Hvis en parameter udelades skal returneres en fejlkode 400', function(done) {
      request.get("http://localhost:3002/" + entityPlural + "/reverse?y=59&srid=25832", function(error, response) {
        if(error) throw error;
        expect(response.statusCode).toBe(400);
        done();
      });
    });
  });

  it('Skal kunne lave reverse geocoding paa adgangsadresse', function(done) {
    getJson("http://localhost:3002/adgangsadresser/reverse?x=61&y=61&srid=25832", function(body) {
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      done();
    });
  });

});