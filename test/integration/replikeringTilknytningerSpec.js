"use strict";

// dette er en integrationstest af adressetilknytninger. Vi opretter nogle adresser og indlæser nogle temaer,
// hvorefter vi verificerer at de forventede tilknytninger udstilles korrekt både som udtræk og hændelser.

var Q = require('q');
var _ = require('underscore');

var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

var sqlCommon = require('../../psql/common');
var crud = require('../../crud/crud');
var tema = require('../../temaer/tema');
var datamodels = require('../../crud/datamodel');
var temaer = require('../../apiSpecification/temaer/temaer');
var tilknytninger = require('../../apiSpecification/tematilknytninger/tilknytninger');

var schemaValidationUtil = require('./schemaValidationUtil');

var helpers = require('./helpers');
var itQ = helpers.itQ;

var adgangsadresser = [
  {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb3546800",
    "status": 1,
    "kommunekode": 1,
    "vejkode": 1,
    "husnr": "1",
    "supplerendebynavn": null,
    "postnr": null,
    "oprettet": "2013-05-22T14:56:22.237",
    "ændret": "2015-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2015-05-22T00:00:00.000",
    "ejerlavkode": null,
    "matrikelnr": null,
    "esrejendomsnr": null,
    "adgangspunktid": "00000000-0000-0000-0000-000000000000",
    "etrs89koordinat_øst": 540000.00,
    "etrs89koordinat_nord": 6200000.00,
    "nøjagtighed": "B",
    "kilde": 4,
    "tekniskstandard": "TD",
    "tekstretning": 100.00,
    "adressepunktændringsdato": "2015-05-22T23:59:00.000",
    "ddkn_m100": null,
    "ddkn_km1": null,
    "ddkn_km10": null
  },
  {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
    "status": 1,
    "kommunekode": 1,
    "vejkode": 1,
    "husnr": "1",
    "supplerendebynavn": null,
    "postnr": null,
    "oprettet": "2013-05-22T14:56:22.237",
    "ændret": "2015-05-22T15:50:49.437",
    "ikrafttrædelsesdato": "2015-05-22T00:00:00.000",
    "ejerlavkode": null,
    "matrikelnr": null,
    "esrejendomsnr": null,
    "adgangspunktid": "00000000-0000-0000-0000-000000000000",
    "etrs89koordinat_øst": 560000.00,
    "etrs89koordinat_nord": 6200000.00,
    "nøjagtighed": "B",
    "kilde": 4,
    "tekniskstandard": "TD",
    "tekstretning": 100.00,
    "adressepunktændringsdato": "2015-05-22T23:59:00.000",
    "ddkn_m100": null,
    "ddkn_km1": null,
    "ddkn_km10": null
  }
];

var polygonContainingFirstAddress = 'POLYGON((530000 6100000,530000 6300000,550000 6300000,550000 6100000,530000 6100000))';
var polygonContainingSecondAddress = 'POLYGON((550000 6100000,550000 6300000,570000 6300000,570000 6100000,550000 6100000))';

var temaObjects = {
  zone: { "zone":1 },
  politikreds: { "kode":99, "navn": "Politikreds test" },
  region: {"kode":99, "navn":"Region test"},
  kommune: { "kode":99, "navn": "Kommune test", "regionskode": 99 },
  postnummer: { "nr":99, "navn": "Postdistrikt test" },
  sogn: { "kode":99, "navn": "Sogn test" },
  opstillingskreds: { "kode":99, "navn": "Opstillingskreds test" },
  retskreds: { "kode":99, "navn": "retskreds test" }
};

// how we expect the keys to be formatted when returned
var expectedKeys = {
  zone: 'Byzone',
  politikreds: '0099',
  region: '0099',
  kommune: '0099',
  postnummer: '0099',
  sogn: '0099',
  opstillingskreds: '0099',
  retskreds: '0099'
};

describe('Replikering af tilknytninger', function () {
  var client;
  var transactionDone;

  beforeEach(function (done) {
    sqlCommon.withWriteTransaction(process.env.pgEmptyDbUrl, function (err, _client, _transactionDone) {
      if (err) {
        throw err;
      }
      client = _client;
      transactionDone = _transactionDone;
      done();
    });
  });

  afterEach(function(done) {
    transactionDone('rollback', function() {
      done();
    });
  });
  // insert the two adresses
  adgangsadresser.forEach(function(adgangsadresse) {
    beforeEach(function(done) {
      var datamodel = datamodels.adgangsadresse;
      var sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
      crud.create(client, datamodel, sqlObject, done);
    });
  });


  _.each(temaObjects, function(temaObject, temaName) {
    var temaDef = _.findWhere(temaer, {singular: temaName});
    var tilknytning = tilknytninger[temaName];
    var datamodelName = temaDef.prefix + 'tilknytning';
    var udtraekResource = registry.findWhere({
      entityName: datamodelName,
      type: 'resource',
      qualifier: 'udtraek'
    });
    var eventResource = registry.findWhere({
      entityName: datamodelName,
      type: 'resource',
      qualifier: 'hændelser'
    });
    itQ('Skal replikere adgangsadressetilknytninger for ' + temaName, function() {
      return tema.addTema(client, {tema: temaName, fields: temaObject, polygons: [polygonContainingFirstAddress]}).then(function () {
        return Q.nfcall(tema.updateAdresserTemaerView, client, temaDef, true);
      }).then(function () {
        return Q.nfcall(helpers.getJson, client, udtraekResource, {}, {});
      }).then(function (jsonResult) {
        var keyFieldName = tilknytning.keyFieldName;
        var expectedResult = {
          adgangsadresseid: adgangsadresser[0].id
        };
        expectedResult[keyFieldName] = expectedKeys[temaName];
        expect(jsonResult).toEqual([expectedResult]);
        return tema.updateTema(client, temaDef, {tema: temaName, fields: temaObject, polygons: [polygonContainingSecondAddress]});
      }).then(function () {
        return tema.updateAdresserTemaerView(client, temaDef, false);
      }).then(function () {
        return Q.nfcall(helpers.getJson, client, udtraekResource, {}, {});
      }).then(function (jsonResult) {
        var keyFieldName = tilknytning.keyFieldName;
        var expectedResult = {
          adgangsadresseid: adgangsadresser[1].id
        };
        expectedResult[keyFieldName] = expectedKeys[temaName];
        expect(jsonResult).toEqual([expectedResult]);
        return Q.nfcall(helpers.getJson, client, eventResource, {}, {});
      }).then(function (eventResult) {
        expect(eventResult.length).toBe(2);
        expect(eventResult[0].operation).toBe('delete');
        expect(eventResult[1].operation).toBe('insert');
        expect(eventResult[0].data.adgangsadresseid).toBe(adgangsadresser[0].id);
        expect(eventResult[1].data.adgangsadresseid).toBe(adgangsadresser[1].id);
        var keyFieldName = tilknytning.keyFieldName;
        expect(eventResult[0].data[keyFieldName]).toBe(expectedKeys[temaName]);
        expect(eventResult[1].data[keyFieldName]).toBe(expectedKeys[temaName]);

        var eventRepresentation = registry.findWhere({
          entityName: datamodelName + '_hændelse',
          type: 'representation',
          qualifier: 'json'
        });

        var eventSchema = eventRepresentation.schema;
        expect(schemaValidationUtil.isSchemaValid(eventResult[0], eventSchema)).toBeTruthy();
        expect(schemaValidationUtil.isSchemaValid(eventResult[1], eventSchema)).toBeTruthy();
      });
    });
  });

});
