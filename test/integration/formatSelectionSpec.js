"use strict";

var request = require("request");
var _       = require('underscore');
var csv     = require('csv');

var jsonpResults = [];

/* jshint ignore:start */
var jsonpCallback = function(result) {
  jsonpResults.push(result);
};
/* jshint ignore:end */

describe('Format selection', function () {
  it("By default, JSON should be returned", function(done) {
    request.get("http://localhost:3000/api/pg/adresser?per_side=10", function(error, response, body) {
      expect(response.headers['content-type']).toBe("application/json; charset=UTF-8");
      var bodyJson = JSON.parse(body);
      expect(_.isArray(bodyJson)).toBe(true);
      done();
    });
  });

  it("If format=json is passed as query parameter, JSON should be returned", function(done) {
    request.get("http://localhost:3000/api/pg/adresser?per_side=10&format=json", function(error, response, body) {
      expect(response.headers['content-type']).toBe("application/json; charset=UTF-8");
      var bodyJson = JSON.parse(body);
      expect(_.isArray(bodyJson)).toBe(true);
      done();
    });
  });

  it("If format=csv is passed as query parameter, CSV should be returned", function(done) {
    request.get("http://localhost:3000/api/pg/adresser?per_side=10&format=csv", function(error, response, body) {
      expect(response.headers['content-type']).toBe("text/csv; charset=UTF-8");
      csv()
        .from.string(body, {columns: true})
        .to.array(function (data) {
          expect(data.length).toBe(10);
          expect(data[0].id).toBeDefined();
          done();
        });
    });
  });

  it("If format=jsonp is passed as query parameter, JSONP should be returned", function(done) {
    request.get("http://localhost:3000/api/pg/adresser?per_side=10&format=jsonp&callback=jsonpCallback", function(error, response, body) {
      expect(response.headers['content-type']).toBe("application/javascript; charset=UTF-8");
      eval(body); // jshint ignore:line
      var result = jsonpResults.pop();
      expect(result).toBeDefined();
      expect(_.isArray(result)).toBe(true);
      expect(result.length).toBe(10);
      done();
    });
  });

  it("If an illegal value is specified as format parameter, a nice JSON error message should be returned", function(done) {
    request.get("http://localhost:3000/api/pg/adresser?per_side=10&format=xml", function(error, response, body) {
      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toBe("application/problem+json; charset=UTF-8");
      var errorMessage = JSON.parse(body);
      expect(errorMessage.type).toEqual('QueryParameterFormatError');
      done();
    });
  });
});