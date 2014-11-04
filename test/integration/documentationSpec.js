"use strict";

var _            = require('underscore');
var parameterDoc = require('../../parameterDoc');
var request    = require('request');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('Parameter documentation.', function() {
  var undocumented = ['format', 'callback', 'srid', 'noformat'];

  var resources = registry.where({
    type: 'resource'
  });

  var docs = parameterDoc;

  resources.forEach(function(resource) {
    describe('Documentation for ' + resource.path, function() {
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

describe('Documentation pages', function() {
  ['generelt', 'adressedok', 'adgangsadressedok', 'vejedok', 'supplerendebynavndok', 'postnummerdok', 'listerdok', 'om', 'replikeringdok'].forEach(function(docPageName) {
    it('It should be possible to retrieve the documentation page ' + docPageName, function(done) {
      request.get("http://localhost:3002/"+ docPageName, function(error, response, body) {
        expect(error).toBeNull();
        expect(response.statusCode).toEqual(200);
        expect(response.headers['content-type']).toBe("text/html; charset=utf-8");
        done();
      });
    });
  });
});