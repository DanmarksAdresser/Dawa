"use strict";

var apiSpec = require('../../apiSpec');
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
  var allSpecs = _.map(apiSpec.allSpecNames, function(specName) {
    return apiSpec[specName];
  });
  var autocompleteSpecs = _.where(allSpecs, {suggestable: true});
  autocompleteSpecs.forEach(function(spec) {
    describe('Autocomplete på ' + spec.model.plural + ' skal virke', function(){
      sampleParameters[spec.model.name].forEach(function(sampleQueryParam) {
        it('Autocomplete på ' + spec.model.plural + ' med parameteren q=' + sampleQueryParam + ' skal virke', function(specDone) {
          var rawQueryParams = {};
          rawQueryParams.q = sampleQueryParam;
          var parseResult = parameterParsing.parseParameters(rawQueryParams,  _.indexBy(apiSpec.autocompleteParameterSpec));
          expect(parseResult.errors.length).toBe(0);
          dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
            if(err) throw 'unable to open connection';
            dbapi.query(client, spec, { autocomplete: parseResult.params }, {limit: 20}, function(err, rows) {
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