"use strict";

var _ = require('underscore');

var request = require("request");
var csv = require('csv');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('CSV udtræk', function() {
  describe('Alle søgninger kan leveres i CSV-format', function() {
    var resources = registry.where({
      type: 'resource',
      qualifier: 'query'
    });
    resources.forEach(function(resource) {
      it('søgning i på' + resource.path + ' kan leveres i CSV-format', function(done) {
        request.get("http://localhost:3000"+ resource.path +"?per_side=1&format=csv", function(error, response, body) {
          expect(response.headers['content-type']).toBe("text/csv; charset=UTF-8");
          csv()
            .from.string(body, {columns: true})
            .to.array(function (data) {
              expect(data.length).toBe(1);
              done();
            });
        });
      });
    });
  });

  // the expected set of columns output in CSV format
  var expectedColumns = {
    adresse: ['id','status', 'oprettet','ændret','vejkode','vejnavn','husnr','etage','dør','supplerendebynavn','postnr','postnrnavn','kommunekode','kommunenavn','ejerlavkode','ejerlavnavn','matrikelnr','esrejendomsnr','etrs89koordinat_øst','etrs89koordinat_nord','wgs84koordinat_bredde','wgs84koordinat_længde','nøjagtighed','kilde','tekniskstandard','tekstretning','ddkn_m100','ddkn_km1','ddkn_km10','adressepunktændringsdato','adgangsadresseid','adgangsadresse_status','adgangsadresse_oprettet','adgangsadresse_ændret','regionskode','regionsnavn','sognekode','sognenavn','politikredskode','politikredsnavn','retskredskode','retskredsnavn','opstillingskredskode','opstillingskredsnavn', 'zone'],
    adgangsadresse: ['id','status','oprettet','ændret','vejkode','vejnavn','husnr','supplerendebynavn','postnr','postnrnavn','kommunekode','kommunenavn','ejerlavkode','ejerlavnavn','matrikelnr','esrejendomsnr','etrs89koordinat_øst','etrs89koordinat_nord','wgs84koordinat_bredde','wgs84koordinat_længde','nøjagtighed','kilde','tekniskstandard','tekstretning','adressepunktændringsdato','ddkn_m100','ddkn_km1','ddkn_km10','regionskode','regionsnavn','sognekode','sognenavn','politikredskode','politikredsnavn','retskredskode','retskredsnavn','opstillingskredskode','opstillingskredsnavn', 'zone'],
    vejstykke: ['kode','kommunekode','oprettet','ændret','kommunenavn','navn','adresseringsnavn'],
    postnummer: ['nr','navn','stormodtageradresser'],
    kommune: ['kode','navn']
  };

  it('CSV udtræk har korrekte kolonnenavne', function() {
    _.each(expectedColumns, function(colNames, datamodelName) {
      var csvRep = registry.findWhere({
        type: 'representation',
        entityName: datamodelName,
        qualifier: 'flat'
      });
      expect(csvRep.outputFields).toEqual(colNames);
    });
  });
});