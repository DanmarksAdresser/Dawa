"use strict";

var request = require("request");

describe("Caching", function() {
  it("2xx svar skal caches", function(done) {
    request.get('http://localhost:3000/adresser?per_side=1', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toMatch(/s-maxage=[\d]+/g);
      done();
    });
  });
  it('fejlsvar skal ikke caches', function(done) {
    request.get('http://localhost:3000/adresser/foobar', function(error, response, body) {
      expect(response.statusCode).toBe(400);
      expect(response.headers['cache-control']).toEqual('no-cache');
      done();
    });
  });

});
