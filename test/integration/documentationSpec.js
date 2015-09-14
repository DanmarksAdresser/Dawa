"use strict";

var expect = require('chai').expect;
var request    = require('request-promise');
var _            = require('underscore');

var parameterDoc = require('../../parameterDoc');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('Parameter documentation.', function() {
  var undocumented = ['format', 'callback', 'srid', 'noformat', 'ndjson'];

  var resources = registry.where({
    type: 'resource'
  });

  var docs = parameterDoc;

  resources.forEach(function(resource) {
    describe('Documentation for ' + resource.path, function() {
      var docSpec = docs[resource.path.replace(/:([\w]+)/g, '{$1}')];
      it('There should be documentation for ' + resource.path, function() {
        expect(docSpec).to.exist;
      });
      resource.queryParameters.forEach(function(parameter) {
        if(_.contains(undocumented, parameter.name)) {
          return;
        }
        it('The query parameter ' + parameter.name + ' should be documented', function() {
          var paramDoc = _.findWhere(docSpec.parameters,{
            name: parameter.name
          });
          expect(paramDoc).to.exist;
          expect(paramDoc.doc).to.exist;
        });
      });
      resource.pathParameters.forEach(function(parameter) {
        it('The path parameter ' + parameter.name + ' should be documented', function() {
          var paramDoc = _.findWhere(docSpec.parameters,{
            name: parameter.name
          });
          expect(paramDoc).to.exist;
          expect(paramDoc.doc).to.exist;
        });
      });
    });
  });
});

describe('Documentation page', function() {
  ['generelt', 'adressedok', 'adgangsadressedok', 'vejedok', 'autocompletedok', 'postnummerdok', 'listerdok', 'om', 'replikeringdok'].forEach(function(docPageName) {
    it(docPageName + ' should be retrievable', function() {
      request.get({
        uri: "http://localhost:3002/"+ docPageName,
        resolveWithFullResponse: true
      }).then(function(response) {
        expect(response.statusCode).to.deep.equal(200);
        expect(response.headers['content-type']).to.equal("text/html; charset=utf-8");
      });
    });
  });

  ['adressedok', 'adgangsadressedok', 'vejedok', 'postnummerdok', 'listerdok'].forEach(function(docPageName) {
    it(docPageName + ' should contain examples', function(done) {
      request.get("http://localhost:3002/"+ docPageName, function(error, response, body) {
        expect(body).to.contain('<h4>Eksempler</h4>');
        done();
      });
    });
  });
});
