"use strict";

var request = require("request");

describe("Caching", function() {
  it("2xx svar skal caches", function(done) {
    request.get('http://localhost:3002/adresser?per_side=1', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toMatch(/s-maxage=[\d]+/g);
      done();
    });
  });
  it('Not found skal ikke caches', function(done) {
    request.get('http://localhost:3002/adresser/foobar', function(error, response, body) {
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control']).toEqual('no-cache');
      done();
    });
  });

  it('Fejlsvar skal ikke caches', function(done) {
    request.get('http://localhost:3002/adresser?cirkel=invalid', function(error, response, body) {
      expect(response.statusCode).toBe(400);
      expect(response.headers['cache-control']).toEqual('no-cache');
      done();
    });
  });
});
