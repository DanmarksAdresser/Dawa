"use strict";

var _            = require('underscore');
var parameterDoc = require('../../parameterDoc');
var apiSpec      = require('../../apiSpec');
//var winston      = require('winston');
//var request    = require('request');

var specsToTest = _.keys(parameterDoc);

describe('Parameter documentation.', function() {
  specsToTest.forEach(function(specName) {
    describe('Documentation for ' + specName+'.', function() {
      var spec = apiSpec[specName];
      var docSpec = parameterDoc[specName];
      var parameterGroups = spec.parameterGroups;
      if (docSpec.docVersion === 1){
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
        // Checking version 2 of parameter doc.

        var pg = parameterGroups;

        checkPG(pg.reverseGeocoding, 'reverse', reverseDocParems(docSpec, spec));
        checkPG(pg.crs,              'reverse', reverseDocParems(docSpec, spec));

        checkPG(pg.crs,            'search',  searchDocParems(docSpec, spec));
        checkPG(pg.propertyfilter, 'search',  searchDocParems(docSpec, spec));
        checkPG(pg.geomWithin,     'search',  searchDocParems(docSpec, spec));
        checkPG(pg.search,         'search',  searchDocParems(docSpec, spec));

        checkPG(pg.crs,            'autocomplete',  autocompleteDocParems(docSpec, spec));
        checkPG(pg.propertyfilter, 'autocomplete',  autocompleteDocParems(docSpec, spec));
        checkPG(pg.geomWithin,     'autocomplete',  autocompleteDocParems(docSpec, spec));
        checkPG(pg.autocomplete,   'autocomplete',  autocompleteDocParems(docSpec, spec));
      }
    });
  });
});

function reverseDocParems(docSpec, spec){
  var res = docSpec.resources['/'+spec.model.plural+'/reverse'];
  return res ? res.parameters : [];
}
function autocompleteDocParems(docSpec, spec){
  return docSpec.resources['/'+spec.model.plural+'/autocomplete'].parameters; }
function searchDocParems(docSpec, spec){
  return docSpec.resources['/'+spec.model.plural].parameters;
}

function checkPG(group, text, paramsInDoc){
  if (group){
    var paramsInDocMap = _.indexBy(paramsInDoc, 'name');
    group.parameters.forEach(
      function(param){
        it('The parameter '+param.name+' should be documented in the '+text+' resource', function(){
          expect(paramsInDocMap[param.name]).toBeDefined();
        });
      }
    );
  }
}
