"use strict";

var expect = require('chai').expect;
var q = require('q');
var _ = require('underscore');

var parameterParsing = require('../../parameterParsing');
var registry = require('../../apiSpecification/registry');
var schemaValidationUtil = require('./schemaValidationUtil');
var testdb = require('../helpers/testdb');
require('../../apiSpecification/allSpecs');

var sampleParameters = {
  '/vejnavne/autocomplete': ['all'],
  '/vejstykker/autocomplete': ['all'],
  '/supplerendebynavne/autocomplete': ['all'],
  '/kommuner/autocomplete': ['aa'],
  '/postnumre/autocomplete': ['so'],
  '/adgangsadresser/autocomplete': ['Strandmarken 43'],
  '/adresser/autocomplete': [ 'strandmarken 43 st']
};

describe('Alle autocomplete ressourcer skal virke', function() {
  var autocompleteResources = registry.where({
    type: 'resource',
    qualifier: 'autocomplete'
  });
  autocompleteResources.forEach(function(resource) {
    if(!sampleParameters[resource.path]) {
      console.log("No test specificed for autocomplete resource at " + resource.path);
      return;
    }
    describe('Autocomplete på ' + resource.path + ' skal virke', function(){
      sampleParameters[resource.path].forEach(function(sampleQueryParam) {
        it('Autocomplete på ' + resource.path + ' med parameteren q=' + sampleQueryParam + ' skal virke', function() {
          var autocompleteRepresentation = resource.representations.autocomplete;
          var rawQueryParams = {};
          rawQueryParams.q = sampleQueryParam;
          var parseResult = parameterParsing.parseParameters(rawQueryParams, _.indexBy(resource.queryParameters, 'name'));
          expect(parseResult.errors.length).to.equal(0);
          var mapper = autocompleteRepresentation.mapper("BASE_URL", parseResult.params, false);
          return testdb.withTransaction('test', 'READ_ONLY', function(client) {
            return q.ninvoke(resource.sqlModel, 'query', client, _.pluck(autocompleteRepresentation.fields, 'name'), parseResult.params).then(function(rows) {
              expect(rows.length).to.be.above(0);
              rows.forEach(function(row) {
                var json = mapper(row);
                expect(schemaValidationUtil.isSchemaValid(json, autocompleteRepresentation.schema)).to.equal(true);
              });
            });
          });
        });
      });
    });
  });
});