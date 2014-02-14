"use strict";

var _ = require('underscore');
var parameterDoc = require('../../parameterDoc');
var apiSpec = require('../../apiSpec');
//var request = require('request');

var specsToTest = ['vejstykke', 'vejnavn'];

describe('Parameter documentation', function() {
  specsToTest.forEach(function(specName) {
    describe('Documentation for ' + specName, function() {
      var spec = apiSpec[specName];
      var docSpec = parameterDoc[specName];
      var docSpecParameterMap = _.indexBy(docSpec.parameters, 'name');
      var apiSpecParameterMap = _.indexBy(spec.parameters, 'name');
      var paramsWhichShouldBeDocumented = spec.parameters;
      if(spec.searchable) {
        paramsWhichShouldBeDocumented = paramsWhichShouldBeDocumented.concat(apiSpec.searchParameterSpec);
      }
      paramsWhichShouldBeDocumented.forEach(function(parameter) {
        it('The parameter ' + parameter.name + ' should be documented', function() {
          expect(docSpecParameterMap[parameter.name]).toBeDefined();
        });
      });
      docSpec.parameters.forEach(function(docParam) {
        it('The documented parameter ' + docParam.name + ' should be specified', function() {
          if(docParam.name === 'q') {
            expect(spec.searchable).toBe(true);
          }
          else {
            expect(apiSpecParameterMap[docParam.name]).toBeDefined();
          }
        });
      });
    });
  });
});
