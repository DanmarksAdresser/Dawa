"use strict";

/**
 * Tests all HTTP based query parameters
 */

var expect = require('chai').expect;
var request = require("request-promise");
var _ = require('underscore');

var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');
const config = require('@dawadk/common/src/config/holder').getConfig();
var sampleParameters = {
  adgangsadresse: {
    kvh: {
      values: ['01558963__74', '01555624__14', '02530149___8'],
      verifier: function(adr, kvh) {
        return adr.kvh === kvh;
      }
    }
  },
  adresse: {
    kvhx: {
      values: ['04619664__26_st___6', '02533712__27__2___7', '04615588_27B_______'],
      verifier: function(adr, kvhx) {
        return adr.kvhx === kvhx;
      }
    }
  }
};

_.keys(sampleParameters).forEach(function(entityName) {
  var resourceSpec = registry.findWhere({
    entityName: entityName,
    type: 'resource',
    qualifier: 'query'
  });

  _.each(sampleParameters[entityName], function(sample, paramName) {
    var verify = sample.verifier;
    sample.values.forEach(function(sampleValue) {
      it('Query ' + entityName + ' for ' + paramName + ' = ' + sampleValue, function () {
        return request.get({
          url: config.get('test.dawa_base_url')+ '/' + resourceSpec.path + '?' + paramName + "=" + sampleValue,
          json: true
        }).then(function (result) {
          if (result.length === 0) {
            throw new Error('Query ' + entityName + ' for ' + paramName + ' = ' + sampleValue + ' resulted in empty query result');
          }
          /*eslint no-console: 0 */
          console.dir(result);
          _.each(result, function (queryMatch) {
            expect(verify(queryMatch, sampleValue)).to.equal(true);
          });
        });
      });
    });
  });
});
