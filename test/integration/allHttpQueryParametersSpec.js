"use strict";

/**
 * Tests all HTTP based query parameters
 */

var _ = require('underscore');
var request = require("request");
var registry = require('../../apiSpecification/registry');

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
      request.get({url: 'http://localhost:3002' + resourceSpec.path + '?' + paramName + "=" + sampleValue, json: true}, function(error, response, result) {
        if (response.statusCode !== 200) { throw 'Query ' + entityName + ' for ' + paramName + ' = ' + sampleValue + ' resulted in response with status ' + response.statusCode; }
        if (result.length === 0) { throw 'Query ' + entityName + ' for ' + paramName + ' = ' + sampleValue + ' resulted in empty query result'; }
        describe('Query ' + entityName + ' for ' + paramName + ' = ' + sampleValue, function() {
          _.each(result, function(queryMatch) {
            it("matcher for resultat '" + JSON.stringify(queryMatch), function(done) {
              expect(verify(queryMatch, sampleValue)).toBe(true);
              done();
            });
          });
        });
      });
    });
  });
});
