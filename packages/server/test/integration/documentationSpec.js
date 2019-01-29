"use strict";

const { go } = require('ts-csp');
const { expect, assert } = require('chai');
var request    = require('request-promise');
var _            = require('underscore');

var parameterDoc = require('../../parameterDoc');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');
const allPages = require('../../apidoc/all-pages');

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
      const paramsNotDefined = ['kvh', 'kvhx'];
      if(docSpec) {
        for(let paramDoc of docSpec.parameters) {
          if(!paramsNotDefined.includes(paramDoc.name)) {
            it(`The documented parameter ${paramDoc.name} should be defined`, () => {
              const param = _.findWhere([...resource.queryParameters, ...resource.pathParameters],
                {name: paramDoc.name});
              expect(param).to.exist;
            });
          }
        }
      }
    });
  });
});

describe('Documentation page', function() {
  ['', '/dok/api', '/dok/adresser',
    '/dok/dagi', '/dok/bbr', '/dok/stednavne', '/dok/matrikelkortet',
    '/dok/guides',
    '/dok/bbr-intern',
    '/dok/faq', '/dok/om'].forEach(function(docPageName) {
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
  for(let page of allPages) {
    it(`Kan hente apidocs siden for ${page.entity}`, () => go(function*() {
      const response = yield request.get({
        uri: `http://localhost:3002/dok/api/${encodeURIComponent(page.entity)}`,
        resolveWithFullResponse: true
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers['content-type'],"text/html; charset=utf-8");
    }));
  }
});
