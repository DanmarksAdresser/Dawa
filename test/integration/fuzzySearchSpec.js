"use strict";

const expect = require('chai').expect;

const { go } = require('ts-csp');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('../helpers/testdb2');

require('../../apiSpecification/allSpecs');


testdb.withTransactionAll('test', function (clientFn) {
  describe('Fuzzy search on vejnavne', function () {
    var vejnavnResource = registry.findWhere({
      entityName: 'vejnavn',
      type: 'resource',
      qualifier: 'query'
    });
    var vejnavnResourceAutocomplete = registry.findWhere({
      entityName: 'vejnavn',
      type: 'resource',
      qualifier: 'autocomplete'
    });
    it('If there is no matches using regular search, and fuzzy search is enabled, I should get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), vejnavnResource, {}, {
          q: 'magrete%20ale',
          fuzzy: '',
          per_side: '10'
        });
        expect(result).to.have.length(10);
        expect(result[0].navn).to.equal('Margrethe Alle');
      }).asPromise();
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), vejnavnResource, {}, {
          q: 'magrete%20ale'
        });
        expect(result).to.have.length(0);
      }).asPromise();
    });

    it('By default, 100 results are returned when doing fuzzy search on query resource', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), vejnavnResource, {}, {
          q: 'magrete%20ale',
          fuzzy: ''
        });
        expect(result).to.have.length(100);
      }).asPromise();
    });

    it('By default, 20 results are returned when doing fuzzy search on autocomplete resource', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), vejnavnResourceAutocomplete, {}, {
          q: 'magrete%20ale',
          fuzzy: ''
        });
        expect(result).to.have.length(20);
      }).asPromise();
    });
  });
  describe('Fuzzy search on adgangsadresser', function () {
    var adgangsadresseResource = registry.findWhere({
      entityName: 'adgangsadresse',
      type: 'resource',
      qualifier: 'query'
    });
    var adgangsadresseAutocompleteResource = registry.findWhere({
      entityName: 'adgangsadresse',
      type: 'resource',
      qualifier: 'autocomplete'
    });
    it('If there is no matches using regular search, and fuzzy search is enabled, I should get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adgangsadresseResource, {}, {
          q: 'Fjors gade 3, Odesne C',
          fuzzy: '',
          per_side: '10'
        });
        expect(result).to.have.length(10);
        expect(result[0].id).to.equal('0a3f5089-2a24-32b8-e044-0003ba298018');
      }).asPromise();
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adgangsadresseResource, {}, {
          q: 'Fjors gade 3, Odesne C'
        });
        expect(result).to.have.length(0);
      }).asPromise();
    });

    it('I can get fuzzy results when autocompleting', function() {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adgangsadresseAutocompleteResource, {}, {
          q: 'Fjors gade 3, Odesne C',
          fuzzy: '',
          per_side: '10'
        });
        expect(result).to.have.length(10);
        expect(result[0].tekst).to.equal('Fjordsgade 3, 5000 Odense C');
      }).asPromise();
    });
  });
  describe('Fuzzy search on adresser', function () {
    var adresseResource = registry.findWhere({
      entityName: 'adresse',
      type: 'resource',
      qualifier: 'query'
    });
    var adresseAutocompleteResource = registry.findWhere({
      entityName: 'adresse',
      type: 'resource',
      qualifier: 'autocomplete'
    });
    it('If there is no matches using regular search, and fuzzy search is enabled, I should get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adresseResource, {}, {
          q: 'Fyre pargen 96, st.th, 5240 odesne',
          fuzzy: '',
          per_side: '10'
        });
        expect(result).to.have.length(10);
        expect(result[0].id).to.equal('0a3f50b3-e1ec-32b8-e044-0003ba298018');
      }).asPromise();
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adresseResource, {}, {
          q: 'Fyre pargen 96, st.th, 5240 odesne'
        });
        expect(result).to.have.length(0);
      }).asPromise();
    });

    it('I can get fuzzy results when autocompleting', function() {
      return go(function*() {
        const result = yield helpers.getJson(clientFn(), adresseAutocompleteResource, {}, {
          q: 'Fyre pargen 96, st.th, 5240 odesne',
          fuzzy: '',
          per_side: '10'
        });
        expect(result).to.have.length(10);
        expect(result[0].tekst).to.equal('Fyrreparken 96, st. th, 5240 Odense NØ');
      }).asPromise();
    });
  });
});
