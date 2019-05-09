"use strict";

var expect = require('chai').expect;
var request = require('request-promise');
var _ = require('underscore');

var consistency = require('../../apiSpecification/consistency');
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe('Consistency checks', function() {
  _.each(consistency, function(res) {
    it('The consistency check ' + res.path + ' should work', function() {
      return request(`${baseUrl}` + res.path, {resolveWithFullResponse: true, json: true}).then(function(result) {
        expect(result.statusCode).to.equal(200);
      });
    });
  });
});