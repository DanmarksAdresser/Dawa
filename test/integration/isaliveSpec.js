"use strict";

var expect = require('chai').expect;
var request = require("request-promise");

describe('isalive', function() {
  it('Should return status code 200', function() {
    return request.get({uri: 'http://localhost:3003/isalive', resolveWithFullResponse: true}).then(function(response) {
      expect(response.statusCode).to.equal(200);
    });
  });
});