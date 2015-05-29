"use strict";

var expect = require('chai').expect;
var request = require("request-promise");
var q = require('q');
var _ = require('underscore');

var csv = require('csv');
var helpers = require('./helpers');
var registry = require('../../apiSpecification/registry');
var testdb = require('../helpers/testdb');

require('../../apiSpecification/allSpecs');

describe('CSV udtræk', function() {
  describe('Alle søgninger kan leveres i CSV-format', function() {
    var resources = registry.where({
      type: 'resource',
      qualifier: 'query'
    });
    resources.forEach(function(resource) {
      it('søgning i ' + resource.path + ' kan leveres i CSV-format', function(done) {
        request.get("http://localhost:3002"+ resource.path +"?per_side=1&format=csv", function(error, response, body) {
          expect(response.headers['content-type']).to.equal("text/csv; charset=UTF-8");
          csv()
            .from.string(body, {columns: true})
            .to.array(function (data) {
              expect(data.length).to.equal(1);
              done();
            });
        });
      });
    });
  });

  // the expected set of columns output in CSV format
  var expectedColumns = {
    adresse: ['id','status','oprettet','ændret','vejkode','vejnavn', 'adresseringsvejnavn','husnr','etage','dør','supplerendebynavn','postnr','postnrnavn','kommunekode','kommunenavn','ejerlavkode','ejerlavnavn','matrikelnr','esrejendomsnr','etrs89koordinat_øst','etrs89koordinat_nord','wgs84koordinat_bredde','wgs84koordinat_længde','nøjagtighed','kilde','tekniskstandard','tekstretning','ddkn_m100','ddkn_km1','ddkn_km10','adressepunktændringsdato','adgangsadresseid','adgangsadresse_status','adgangsadresse_oprettet','adgangsadresse_ændret','regionskode','regionsnavn','kvhx','sognekode','sognenavn','politikredskode','politikredsnavn','retskredskode','retskredsnavn','opstillingskredskode','opstillingskredsnavn', 'zone', 'jordstykke_ejerlavkode', 'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr'],
    adgangsadresse: ['id','status','oprettet','ændret','vejkode','vejnavn', 'adresseringsvejnavn','husnr','supplerendebynavn','postnr','postnrnavn','kommunekode','kommunenavn','ejerlavkode','ejerlavnavn','matrikelnr','esrejendomsnr','etrs89koordinat_øst','etrs89koordinat_nord','wgs84koordinat_bredde','wgs84koordinat_længde','nøjagtighed','kilde','tekniskstandard','tekstretning','adressepunktændringsdato','ddkn_m100','ddkn_km1','ddkn_km10','regionskode','regionsnavn','kvh','sognekode','sognenavn','politikredskode','politikredsnavn','retskredskode','retskredsnavn','opstillingskredskode','opstillingskredsnavn', 'zone', 'jordstykke_ejerlavkode', 'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr'],
    vejstykke: ['kode','kommunekode','oprettet','ændret','kommunenavn','navn','adresseringsnavn'],
    postnummer: ['nr','navn','stormodtager'],
    kommune: ['kode','navn', 'regionskode', 'ændret', 'geo_ændret', 'geo_version']
  };

  it('CSV udtræk har korrekte kolonnenavne', function() {
    _.each(expectedColumns, function(colNames, datamodelName) {
      var csvRep = registry.findWhere({
        type: 'representation',
        entityName: datamodelName,
        qualifier: 'flat'
      });
      expect(csvRep.outputFields).to.deep.equal(colNames);
    });
  });

  describe('Alle CSV felter ses mindst én gang', function() {

    // Disse felter mangler i vores testdata
    var neverExpectedToBeSeen = {
      vejstykke: ['oprettet', 'ændret', 'adresseringsnavn']
    };

    // for at se et felt hvor stormodtager er angivet skal vi have dem med ud for postnumrene
    var additionalParams = {
      postnummer: {
        stormodtagere: 'true'
      }
    };
    _.each(expectedColumns, function(colNames, datamodelName) {
      var seenFields = {};
      var resource = registry.findWhere({entityName: datamodelName, type: 'resource', qualifier: 'query'});
      it('Alle CSV felter i ' + datamodelName + ' skal ses mindst en gang', function() {
        testdb.withTransaction('test', 'ROLLBACK', function(client) {
          return q.nfcall(helpers.getCsv, client, resource, [], _.extend({}, additionalParams[datamodelName] || {}, { format: 'csv'})).then(function(result) {
            result.forEach(function(csvRow) {
              _.each(csvRow, function(value, key) {
                if(value !== undefined && value !== null && value.trim() !== '') {
                  seenFields[key] = true;
                }
              });
            });
            expect(Object.keys(seenFields).concat(neverExpectedToBeSeen[datamodelName] || []).sort()).to.deep.equal(colNames.slice().sort());
          });
        });
      });
    });
  });
});