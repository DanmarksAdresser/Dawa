"use strict";

var _            = require('underscore');
var parameterDoc = require('../../parameterDoc');
//var winston      = require('winston');
//var request    = require('request');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('Parameter documentation.', function() {
  var undocumented = ['format', 'callback', 'srid'];

  var resources = registry.where({
    type: 'resource'
  });

  var docs = _.reduce(parameterDoc, function(memo, typeDoc) {
    _.extend(memo, typeDoc.resources);
    return memo;
  }, {});
  console.log(JSON.stringify(docs));
  resources.forEach(function(resource) {
    describe('Documentation for ' + resource.path, function() {
      console.log(resource.path.replace(/:([\w]+)/g, '{$1}'));
      var docSpec = docs[resource.path.replace(/:([\w]+)/g, '{$1}')];
      it('There should be documentation for ' + resource.path, function() {
        expect(docSpec).toBeDefined();
      });
      resource.queryParameters.forEach(function(parameter) {
        if(_.contains(undocumented, parameter.name)) {
          return;
        }
        it('The query parameter ' + parameter.name + ' should be documented', function() {
          var paramDoc = _.findWhere(docSpec.parameters,{
            name: parameter.name
          });
          expect(paramDoc).toBeDefined();
          expect(paramDoc.doc).toBeDefined();
        });
      });
      resource.pathParameters.forEach(function(parameter) {
        it('The path parameter ' + parameter.name + ' should be documented', function() {
          var paramDoc = _.findWhere(docSpec.parameters,{
            name: parameter.name
          });
          expect(paramDoc).toBeDefined();
          expect(paramDoc.doc).toBeDefined();
        });
      });
    });
  });
});
