"use strict";

var expect = require('chai').expect;
var _ = require('underscore');

var parameterParsing = require('../../parameterParsing');
var registry = require('../../apiSpecification/registry');
var schemaValidationUtil = require('./schemaValidationUtil');
var testdb = require('../helpers/testdb2');
const { go } = require('ts-csp');
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
            return go(function*() {
              const rows = yield resource.sqlModel.processQuery(
                client,
                _.pluck(autocompleteRepresentation.fields, 'name'),
                parseResult.params);
              expect(rows.length).to.be.above(0);
              rows.forEach(function(row) {
                var json = mapper(row);
                expect(schemaValidationUtil.isSchemaValid(json, autocompleteRepresentation.schema)).to.equal(true);
              });
            });
          }).asPromise();
        });
      });
    });
  });
});
