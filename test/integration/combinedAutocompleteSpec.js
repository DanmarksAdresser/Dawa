"use strict";

var expect = require('chai').expect;
var request = require('request-promise');

require('../../apiSpecification/allSpecs');

var autocomplete = require('../../apiSpecification/autocomplete/autocomplete');
var helpers = require('./helpers');
var request = require('request-promise');
var testdb = require('../helpers/testdb');



describe('Autocomplete', function() {
  it('Skal kunne autocomplete en adresse', function() {
    return request.get({
      uri:'http://localhost:3002/autocomplete?q=' + encodeURIComponent('Magtenbøllevej 102'),
      json: true
    }).then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].data.vejnavn).to.equal('Magtenbøllevej');
    });
  });

  testdb.withTransactionEach('test', function(clientFn) {
    it('Skal returnere vejnavne hvis mere end et vejnavn matcher', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "2", q: "ma", type: "adresse"}).then(function(result) {
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
      });
    });
    it('Skal returnere vejnavne, hvis "vejnavn" er angivet som type', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "12", q: "Magtenbøllev", type: "vejnavn"}).then(function(result) {
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('vejnavn');
      });
    });
    it('Skal returnere adgangsadresser, hvis "adgangsadresse er angivet som type', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "18", q: "Magtenbøllevej 102", type: "adgangsadresse"}).then(function(result) {
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adgangsadresse');
      });
    });
    it('* i søgning skal placeres ved careten', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "12", q: "Magtenbøllev 102"}).then(function(result) {
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adresse');
      });
    });
    it('Ved angivelse af adgangsadresseid skal søgningen begrænses til denne ID', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "11", q: "Mannerupvej", adgangsadresseid: "0a3f5081-c65d-32b8-e044-0003ba298018"}).then(function(result) {
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('adresse');
        expect(result[0].data.id).to.equal("0a3f50ab-ab5c-32b8-e044-0003ba298018");
      });
    });
    it('Hvis der søges efter adresser men returneres vejnavne,' +
    ' så skal vejnavnet tilføjes et mellemrum og careten placeres efter mellemrummet', function() {
      return helpers.getJson(clientFn(), autocomplete, {}, {caretpos: "2", q: "ma"}).then(function(result) {
        expect(result.length).to.be.above(1);
        expect(result[0].type).to.equal('vejnavn');
        expect(result[0].tekst.charAt(result[0].tekst.length - 1)).to.equal(' ');
        expect(result[0].caretpos).to.equal(result[0].tekst.length);
      });
    });
    it('Hvis der søges efter adresser, men returneres adgangsadresser,' +
    ' så skal careten placeres såd den er klar til indtastning af etage og dør', function () {
      return helpers.getJson(clientFn(), autocomplete, {}, {q: "Thomas B. Thriges Gade"})
        .then(function (result) {
          expect(result.length).to.be.above(1);
          var sugg = result[0];
          expect(sugg.type).to.equal('adgangsadresse');
          expect(sugg.tekst).to.equal('Thomas B. Thriges Gade 30, , 5000 Odense C');
          expect(sugg.caretpos).to.equal('Thomas B. Thriges Gade 30, '.length);
        });
    });
  });
});