"use strict";

var _ = require('underscore');
var parameterParsing = require('../../parameterParsing');
var dbapi = require('../../dbapi');
var schemaValidationUtil = require('./schemaValidationUtil');
var registry = require('../../apiSpecification/registry');
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
        it('Autocomplete på ' + resource.path + ' med parameteren q=' + sampleQueryParam + ' skal virke', function(specDone) {
          var autocompleteRepresentation = resource.representations.autocomplete;
          var rawQueryParams = {};
          rawQueryParams.q = sampleQueryParam;
          var parseResult = parameterParsing.parseParameters(rawQueryParams, _.indexBy(resource.queryParameters, 'name'));
          expect(parseResult.errors.length).toBe(0);
          var query = resource.sqlModel.createQuery(_.pluck(autocompleteRepresentation.fields, 'name'), parseResult.params);
          var mapper = autocompleteRepresentation.mapper("BASE_URL", parseResult.params, false);
          dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
            if(err) throw 'unable to open connection';
            dbapi.queryRaw(client, query.sql, query.params, function(err, rows) {
              transactionDone();
              expect(err).toBeFalsy();
              expect(rows.length).toBeGreaterThan(0);
              rows.forEach(function(row) {
                var json = mapper(row);
                expect(schemaValidationUtil.isSchemaValid(json, autocompleteRepresentation.schema)).toBe(true);
              });
              specDone();
            });
          });
        });
      });
    });

  });
});