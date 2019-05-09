"use strict";

var expect = require('chai').expect;
var request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();

describe('isalive', function() {
  it('Should return status code 200', function() {
    return request.get({uri: `${config.get('test.master_base_url')}/isalive`, resolveWithFullResponse: true}).then(function(response) {
      expect(response.statusCode).to.equal(200);
    });
  });
});