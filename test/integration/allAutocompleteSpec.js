"use strict";

var apiSpec = require('../../apiSpec');
var apiSpecUtil = require('../../apiSpecUtil');
var autocompleteRepresentations = require('../../apiSpecification/autocompleteRepresentations');
var _ = require('underscore');
var parameterParsing = require('../../parameterParsing');
var dbapi = require('../../dbapi');
var schemaValidationUtil = require('./schemaValidationUtil');

var sampleParameters = {
  vejnavn: ['all'],
  vejstykke: ['all'],
  supplerendebynavn: ['all'],
  kommune: ['aa'],
  postnummer: ['so'],
  adgangsadresse: ['skolevænget 2'],
  adresse: [ 'kirkevej 56G st']
};

describe('Alle suggestable specs skal kunne autocomplete', function() {
  var allSpecs = _.map(_.keys(sampleParameters), function(specName) {
    return apiSpec[specName];
  });
  var autocompleteSpecs = allSpecs;
  autocompleteSpecs.forEach(function(spec) {
    describe('Autocomplete på ' + spec.model.plural + ' skal virke', function(){
      sampleParameters[spec.model.name].forEach(function(sampleQueryParam) {
        it('Autocomplete på ' + spec.model.plural + ' med parameteren q=' + sampleQueryParam + ' skal virke', function(specDone) {
          var rawQueryParams = {};
          rawQueryParams.q = sampleQueryParam;
          var parseResult = parameterParsing.parseParameters(rawQueryParams,  _.indexBy(apiSpec.autocompleteParameterSpec));
          expect(parseResult.errors.length).toBe(0);
          var sqlParts = apiSpecUtil.createSqlParts(spec,
            {autocomplete: spec.parameterGroups.autocomplete},
            parseResult.params,
            autocompleteRepresentations[spec.model.name].fields || _.pluck(spec.fields, 'name'));
          dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
            if(err) throw 'unable to open connection';
            dbapi.query(client, sqlParts, function(err, rows) {
              transactionDone();
              expect(err).toBeFalsy();
              expect(rows.length).toBeGreaterThan(0);
              rows.forEach(function(row) {
                var json = spec.mappers.autocomplete(row, {baseUrl: "BASE_URL"});
                expect(schemaValidationUtil.isSchemaValid(json, spec.model.autocompleteSchema)).toBe(true);
              });
              specDone();
            });
          });
        });
      });
    });
  });
});