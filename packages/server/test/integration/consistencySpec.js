"use strict";

var expect = require('chai').expect;
var request = require('request-promise');
var _ = require('underscore');

var consistency = require('../../apiSpecification/consistency');

describe('Consistency checks', function() {
  _.each(consistency, function(res) {
    it('The consistency check ' + res.path + ' should work', function() {
      return request("http://localhost:3002" + res.path, {resolveWithFullResponse: true, json: true}).then(function(result) {
        expect(result.statusCode).to.equal(200);
      });
    });
  });
});