"use strict";

var _            = require('underscore');
var parameterDoc = require('../../parameterDoc');
var apiSpec      = require('../../apiSpec');
var winston      = require('winston');
//var request    = require('request');

var specsToTest = _.keys(parameterDoc);

describe('Parameter documentation', function() {
  specsToTest.forEach(function(specName) {
    describe('Documentation for ' + specName, function() {
      var spec = apiSpec[specName];
      var docSpec = parameterDoc[specName];
      if (docSpec.docVersion === 1){
        var parameterGroups = spec.parameterGroups;
        var parametersWhichShouldBeDocumented = _.reduce(parameterGroups, function(memo, parameterGroup) {
          return memo.concat(parameterGroup.parameters);
        }, []);
        var docSpecParameterMap = _.indexBy(docSpec.parameters, 'name');
        var apiSpecParameterMap = _.indexBy(parametersWhichShouldBeDocumented, 'name');
        parametersWhichShouldBeDocumented.forEach(function(parameter) {
          it('The parameter ' + parameter.name + ' should be documented', function() {
            expect(docSpecParameterMap[parameter.name]).toBeDefined();
          });
        });
        docSpec.parameters.forEach(function(docParam) {
          it('The documented parameter ' + docParam.name + ' should be specified', function() {
            expect(apiSpecParameterMap[docParam.name]).toBeDefined();
          });
        });
      } else {
        winston.info('=============== TODO: document version 2 =================================');
        winston.info('=============== TODO: document version 2 =================================');
        winston.info('=============== TODO: document version 2 =================================');
        winston.info('=============== TODO: document version 2 =================================');
        winston.info('=============== TODO: document version 2 =================================');
      }
    });
  });
});
