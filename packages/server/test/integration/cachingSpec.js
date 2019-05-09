"use strict";

var expect = require('chai').expect;
var request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe("Caching", function() {
  it("2xx svar skal caches", function(done) {
    request.get(`${baseUrl}/adresser?per_side=1`, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      expect(response.headers['cache-control']).to.match(/max-age=[\d]+/g);
      done();
    });
  });
  it('Not found skal ikke caches', function(done) {
    request.get(`${baseUrl}/adresser/foobar`, function(error, response, body) {
      expect(response.statusCode).to.equal(404);
      expect(response.headers['cache-control']).to.deep.equal('no-cache');
      done();
    });
  });

  it('Fejlsvar skal ikke caches', function(done) {
    request.get(`${baseUrl}/adresser?cirkel=invalid`, function(error, response, body) {
      expect(response.statusCode).to.equal(400);
      expect(response.headers['cache-control']).to.deep.equal('no-cache');
      done();
    });
  });
});
