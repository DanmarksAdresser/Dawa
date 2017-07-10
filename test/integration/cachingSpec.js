"use strict";

var expect = require('chai').expect;
var request = require("request-promise");

describe("Caching", function() {
  it("2xx svar skal caches", function(done) {
    request.get('http://localhost:3002/adresser?per_side=1', function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      expect(response.headers['cache-control']).to.match(/maxage=[\d]+/g);
      done();
    });
  });
  it('Not found skal ikke caches', function(done) {
    request.get('http://localhost:3002/adresser/foobar', function(error, response, body) {
      expect(response.statusCode).to.equal(404);
      expect(response.headers['cache-control']).to.deep.equal('no-cache');
      done();
    });
  });

  it('Fejlsvar skal ikke caches', function(done) {
    request.get('http://localhost:3002/adresser?cirkel=invalid', function(error, response, body) {
      expect(response.statusCode).to.equal(400);
      expect(response.headers['cache-control']).to.deep.equal('no-cache');
      done();
    });
  });
});
