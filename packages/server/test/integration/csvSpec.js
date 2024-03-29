"use strict";
const { go } = require('ts-csp');
var expect = require('chai').expect;
var request = require("request-promise");
var q = require('q');
var _ = require('underscore');

const csvParseSync = require('csv-parse/lib/sync')
var helpers = require('./helpers');
var registry = require('../../apiSpecification/registry');
var testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe('CSV udtræk', function () {
  describe('Alle søgninger kan leveres i CSV-format', function () {
    var resources = registry.where({
      type: 'resource',
      qualifier: 'query'
    });
    resources.forEach(function (resource) {
      it('søgning i ' + resource.path + ' kan leveres i CSV-format', () => go(function* () {
        const response = yield request.get({
          url: `${baseUrl}${resource.path}?per_side=1&format=csv`,
          resolveWithFullResponse: true
        });
        expect(response.headers['content-type']).to.equal("text/csv; charset=UTF-8");
        const data = csvParseSync(response.body, {columns: true});
        expect(data.length).to.equal(1);
      }));
    });
  });

  // the expected set of columns output in CSV format
  var expectedColumns = {
    adresse: ['id','status','oprettet','ændret','vejkode','vejnavn', 'adresseringsvejnavn','husnr',
      'etage','dør','supplerendebynavn','postnr','postnrnavn', 'stormodtagerpostnr',
      'stormodtagerpostnrnavn','kommunekode','kommunenavn','ejerlavkode','ejerlavnavn',
      'matrikelnr','esrejendomsnr','etrs89koordinat_øst','etrs89koordinat_nord','wgs84koordinat_bredde',
      'wgs84koordinat_længde','nøjagtighed','kilde','tekniskstandard','tekstretning','ddkn_m100',
      'ddkn_km1','ddkn_km10','adressepunktændringsdato','adgangsadresseid','adgangsadresse_status',
      'adgangsadresse_oprettet','adgangsadresse_ændret','regionskode','regionsnavn', 'jordstykke_ejerlavnavn',
      'kvhx','sognekode','sognenavn','politikredskode','politikredsnavn','retskredskode','retskredsnavn',
      'opstillingskredskode','opstillingskredsnavn', 'zone', 'jordstykke_ejerlavkode',
      'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr', 'kvh', 'højde', 'adgangspunktid',
      'vejpunkt_id', 'vejpunkt_kilde', 'vejpunkt_nøjagtighed', 'vejpunkt_tekniskstandard',
      'vejpunkt_x', 'vejpunkt_y', 'afstemningsområdenummer', 'afstemningsområdenavn', 'brofast',
      'supplerendebynavn_dagi_id', 'navngivenvej_id', 'menighedsrådsafstemningsområdenummer',
      'menighedsrådsafstemningsområdenavn', 'vejpunkt_ændret',
      'ikrafttrædelse', 'nedlagt', 'adgangsadresse_ikrafttrædelse', 'adgangsadresse_nedlagt',
      'adgangsadresse_darstatus', 'darstatus', 'storkredsnummer', 'storkredsnavn',
      'valglandsdelsbogstav', 'valglandsdelsnavn', 'landsdelsnuts3', 'landsdelsnavn', 'betegnelse'],
    adgangsadresse: ['id','status','oprettet','ændret','vejkode','vejnavn', 'adresseringsvejnavn',
      'husnr','supplerendebynavn','postnr','postnrnavn', 'stormodtagerpostnr', 'stormodtagerpostnrnavn',
      'kommunekode','kommunenavn','ejerlavkode','ejerlavnavn','matrikelnr','esrejendomsnr','etrs89koordinat_øst',
      'etrs89koordinat_nord','wgs84koordinat_bredde','wgs84koordinat_længde','nøjagtighed','kilde',
      'tekniskstandard','tekstretning','adressepunktændringsdato','ddkn_m100','ddkn_km1','ddkn_km10',
      'regionskode','regionsnavn', 'jordstykke_ejerlavnavn','kvh','sognekode','sognenavn','politikredskode',
      'politikredsnavn','retskredskode','retskredsnavn','opstillingskredskode','opstillingskredsnavn', 'zone',
      'jordstykke_ejerlavkode', 'jordstykke_matrikelnr', 'jordstykke_esrejendomsnr', 'højde', 'adgangspunktid',
      'vejpunkt_id', 'vejpunkt_kilde', 'vejpunkt_nøjagtighed', 'vejpunkt_tekniskstandard', 'vejpunkt_x','vejpunkt_y',
      'afstemningsområdenummer', 'afstemningsområdenavn', 'brofast', 'supplerendebynavn_dagi_id', 'navngivenvej_id',
      'menighedsrådsafstemningsområdenummer', 'menighedsrådsafstemningsområdenavn', 'vejpunkt_ændret', 'ikrafttrædelse',
      'nedlagt', 'darstatus', 'storkredsnummer', 'storkredsnavn',
      'valglandsdelsbogstav', 'valglandsdelsnavn', 'landsdelsnuts3', 'landsdelsnavn', 'betegnelse'],
    vejstykke: ['kode','kommunekode','oprettet','ændret','kommunenavn','navn','adresseringsnavn', 'navngivenvej_id', 'navngivenvej_darstatus', 'id', 'darstatus', 'nedlagt', 'bbox_xmin', 'bbox_ymin', 'bbox_xmax', 'bbox_ymax', 'visueltcenter_x', 'visueltcenter_y'],
    postnummer: ['nr','navn','stormodtager', 'bbox_xmin', 'bbox_ymin', 'bbox_xmax', 'bbox_ymax', 'visueltcenter_x', 'visueltcenter_y', "ændret",  "geo_ændret",  "geo_version",  "dagi_id"],
    kommune: ['dagi_id', 'kode','navn', 'regionskode', 'udenforkommuneinddeling', 'regionsnavn', 'ændret', 'geo_ændret', 'geo_version', 'bbox_xmin', 'bbox_ymin', 'bbox_xmax', 'bbox_ymax', 'visueltcenter_x', 'visueltcenter_y'],
    navngivenvej: ['id','darstatus', 'oprettet','ændret','navn','adresseringsnavn',
      'administrerendekommunekode','administrerendekommunenavn',
      'retskrivningskontrol','udtaltvejnavn',
      'beliggenhed_oprindelse_kilde',
      'beliggenhed_oprindelse_nøjagtighedsklasse',
      'beliggenhed_oprindelse_registrering',
      'beliggenhed_oprindelse_tekniskstandard',
      'beliggenhed_geometritype',
      "bbox_xmin",
      "bbox_ymin",
      "bbox_xmax",
      "bbox_ymax",
      "visueltcenter_x",
      "visueltcenter_y",
      "ikrafttrædelse",
      "nedlagt"
    ]
  };

  _.each(expectedColumns, function (colNames, datamodelName) {
    it(`CSV udtræk for ${datamodelName} har korrekte kolonnenavne`, function () {
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
