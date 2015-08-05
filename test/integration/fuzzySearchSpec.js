"use strict";

var expect = require('chai').expect;

var helpers = require('./helpers');
var registry = require('../../apiSpecification/registry');
var testdb = require('../helpers/testdb');

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
      return helpers.getJson(clientFn(), vejnavnResource, {}, {
        q: 'magrete%20ale',
        fuzzy: '',
        per_side: '10'
      }).then(function (result) {
        expect(result).to.have.length(10);
        expect(result[0].navn).to.equal('Margrethe Alle');
      });
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return helpers.getJson(clientFn(), vejnavnResource, {}, {
        q: 'magrete%20ale'
      }).then(function (result) {
        expect(result).to.have.length(0);
      });
    });

    it('By default, 100 results are returned when doing fuzzy search on query resource', function () {
      return helpers.getJson(clientFn(), vejnavnResource, {}, {
        q: 'magrete%20ale',
        fuzzy: ''
      }).then(function (result) {
        expect(result).to.have.length(100);
      });
    });

    it('By default, 20 results are returned when doing fuzzy search on autocomplete resource', function () {
      return helpers.getJson(clientFn(), vejnavnResourceAutocomplete, {}, {
        q: 'magrete%20ale',
        fuzzy: ''
      }).then(function (result) {
        expect(result).to.have.length(20);
      });
    });
    it('I cannot page beyond 100 results when doing fuzzy search', function() {
      return helpers.getResponse(clientFn(), vejnavnResource, {}, {
        q: 'magrete%20ale',
        fuzzy: '',
        per_side: '10',
        side: 11
      }).then(function (response) {
        expect(response.status).to.equal(400);
      });
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
      return helpers.getJson(clientFn(), adgangsadresseResource, {}, {
        q: 'Fjors gade 3, Odesne C',
        fuzzy: '',
        per_side: '10'
      }).then(function (result) {
        expect(result).to.have.length(10);
        expect(result[0].id).to.equal('0a3f5089-2a24-32b8-e044-0003ba298018');
      });
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return helpers.getJson(clientFn(), adgangsadresseResource, {}, {
        q: 'Fjors gade 3, Odesne C'
      }).then(function (result) {
        expect(result).to.have.length(0);
      });
    });

    it('I can get fuzzy results when autocompleting', function() {
      return helpers.getJson(clientFn(), adgangsadresseAutocompleteResource, {}, {
        q: 'Fjors gade 3, Odesne C',
        fuzzy: '',
        per_side: '10'
      }).then(function (result) {
        expect(result).to.have.length(10);
        expect(result[0].tekst).to.equal('Fjordsgade 3, 5000 Odense C');
      });
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
      return helpers.getJson(clientFn(), adresseResource, {}, {
        q: 'Fyre pargen 96, st.th, 5240 odesne',
        fuzzy: '',
        per_side: '10'
      }).then(function (result) {
        expect(result).to.have.length(10);
        expect(result[0].id).to.equal('0a3f50b3-e1ec-32b8-e044-0003ba298018');
      });
    });

    it('If fuzzy search is not enabled, I should not get fuzzy results', function () {
      return helpers.getJson(clientFn(), adresseResource, {}, {
        q: 'Fyre pargen 96, st.th, 5240 odesne'
      }).then(function (result) {
        expect(result).to.have.length(0);
      });
    });

    it('I can get fuzzy results when autocompleting', function() {
      return helpers.getJson(clientFn(), adresseAutocompleteResource, {}, {
        q: 'Fyre pargen 96, st.th, 5240 odesne',
        fuzzy: '',
        per_side: '10'
      }).then(function (result) {
        expect(result).to.have.length(10);
        expect(result[0].tekst).to.equal('Fyrreparken 96, st. th, 5240 Odense NØ');
      });
    });
  });
});