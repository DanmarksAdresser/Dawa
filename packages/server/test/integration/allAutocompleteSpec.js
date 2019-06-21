"use strict";

const {assert, expect} = require('chai');
const _ = require('underscore');

const parameterParsing = require('../../parameterParsing');
const registry = require('../../apiSpecification/registry');
const schemaValidationUtil = require('./schemaValidationUtil');
const { go } = require('ts-csp');
require('../../apiSpecification/allSpecs');
const testdb = require('@dawadk/test-util/src/testdb');
const helpers = require('./helpers');

const sampleParameters = {
  '/vejnavne/autocomplete': ['all'],
  '/vejstykker/autocomplete': ['all'],
  '/supplerendebynavne/autocomplete': ['all'],
  '/kommuner/autocomplete': ['aa'],
  '/postnumre/autocomplete': ['so'],
  '/adgangsadresser/autocomplete': ['Strandmarken 43'],
  '/adresser/autocomplete': [ 'strandmarken 43 st'],
  '/jordstykker/autocomplete': ['borup 1'],
  '/regioner/autocomplete': ['test'],
  '/sogne/autocomplete':['test'],
  '/politikredse/autocomplete': ['test'],
  '/retskredse/autocomplete': ['test'],
  '/opstillingskredse/autocomplete': ['test'],
  '/valglandsdele/autocomplete': ['test'],
  '/storkredse/autocomplete': ['test'],
  '/afstemningsomraader/autocomplete': ['osted'],
  '/menighedsraadsafstemningsomraader/autocomplete': ['test'],
  '/supplerendebynavne2/autocomplete': ['høj'],
  '/landsdele/autocomplete': ['test'],
  '/ejerlav/autocomplete': ['bor'],
  '/navngivneveje/autocomplete': ['dro'],
  '/stednavne2/autocomplete': ['nord'],
  '/stednavne/autocomplete': ['nord']
};

const skipMiniSchemaValidation = {
  '/jordstykker': true,
  '/kommuner': true,
  '/regioner': true,
  '/landsdele': true,
  '/afstemningsomraader': true,
  '/opstillingskredse': true,
  '/storkredse': true,
  '/valglandsdele': true,
  '/sogne': true,
  '/menighedsraadsafstemningsomraader': true,
  '/supplerendebynavne2': true,
  '/retskredse': true,
  '/politikredse': true

};

describe('Autocomplete parameter', () => {
  const queryResourcesWithAutocomplete =  registry.where({
    type: 'resource',
    qualifier: 'query'
  }).filter(resource => {
    const parameters = resource.queryParameters;
    return parameters.some(({name}) => name === 'autocomplete');
  });

  testdb.withTransactionEach('test', (clientFn) => {
    for(let resource of queryResourcesWithAutocomplete) {
      it(`Autocomplete parameter på ${resource.path} skal returnere valide mini-strukturer`, () => go(function*() {
        const jsonResult = yield helpers.getJson(clientFn(), resource, {}, 
          {
            q: sampleParameters[`${resource.path}/autocomplete`][0],
            autocomplete: ''
          });
        assert(jsonResult.length > 0);
        const miniRepresentation = resource.representations.mini;
        if(!skipMiniSchemaValidation[resource.path]) {
          for(let row of jsonResult) {
            assert(schemaValidationUtil.isSchemaValid(row, miniRepresentation.schema))
          }
        }
      }));
    }
  });
});

describe('Alle autocomplete ressourcer skal virke', function() {
  const autocompleteResources = registry.where({
    type: 'resource',
    qualifier: 'autocomplete'
  });
  autocompleteResources.forEach(function(resource) {
    if(resource.path !== '/autocomplete') {
      describe('Autocomplete på ' + resource.path + ' skal virke', function(){
        if(!sampleParameters[resource.path]) {
          throw new Error(`Manglende autocomplete test for ${resource.path}`);
        }
        sampleParameters[resource.path].forEach(function(sampleQueryParam) {
          it('Autocomplete på ' + resource.path + ' med parameteren q=' + sampleQueryParam + ' skal virke', function() {
            const autocompleteRepresentation = resource.representations.autocomplete;
            const rawQueryParams = {};
            rawQueryParams.q = sampleQueryParam;
            const parseResult = parameterParsing.parseParameters(rawQueryParams, _.indexBy(resource.queryParameters, 'name'));
            expect(parseResult.errors.length).to.equal(0);
            const mapper = autocompleteRepresentation.mapper("BASE_URL", parseResult.params, false);
            return testdb.withTransaction('test', 'READ_ONLY', function(client) {
              return go(function*() {
                const rows = yield resource.sqlModel.processQuery(
                  client,
                  _.pluck(autocompleteRepresentation.fields, 'name'),
                  parseResult.params);
                expect(rows.length).to.be.above(0);
                rows.forEach(function(row) {
                  const json = mapper(row);
                  expect(schemaValidationUtil.isSchemaValid(json, autocompleteRepresentation.schema)).to.equal(true);
                });
              });
            }).asPromise();
          });
        });
      });
    }
  });
});
