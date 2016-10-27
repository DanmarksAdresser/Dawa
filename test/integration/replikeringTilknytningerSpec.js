"use strict";

// dette er en integrationstest af adressetilknytninger. Vi opretter nogle adresser og indlæser nogle temaer,
// hvorefter vi verificerer at de forventede tilknytninger udstilles korrekt både som udtræk og hændelser.

var expect = require('chai').expect;
var q = require('q');
const Readable = require('stream').Readable;
const WKT = require('terraformer-wkt-parser');
var _ = require('underscore');

var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

var crud = require('../../crud/crud');
var Husnr = require('../../psql/databaseTypes').Husnr;
var tema = require('../../temaer/tema');
var testdb = require('../helpers/testdb');
var datamodels = require('../../crud/datamodel');
var temaer = require('../../apiSpecification/temaer/temaer');
var tilknytninger = require('../../apiSpecification/tematilknytninger/tilknytninger');
const flats = require('../../apiSpecification/flats/flats');
const flatTilknytninger = require('../../apiSpecification/flats/tilknytninger/tilknytninger');
const importBebyggelserImpl = require('../../bebyggelser/importBebyggelserImpl');
const importJordstykkerImpl = require('../../matrikeldata/importJordstykkerImpl');

var schemaValidationUtil = require('./schemaValidationUtil');

var helpers = require('./helpers');

var adgangsadresser = [
  {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb3546800",
    "status": 1,
    "kommunekode": 1,
    "vejkode": 1,
    "husnr": new Husnr(1, null),
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
    "adressepunktændringsdato": "2015-05-22T23:59:00.000"
  },
  {
    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
    "status": 1,
    "kommunekode": 1,
    "vejkode": 1,
    "husnr": new Husnr(1, null),
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
    "adressepunktændringsdato": "2015-05-22T23:59:00.000"
  }
];

var polygonContainingFirstAddress = 'POLYGON((530000 6100000,530000 6300000,550000 6300000,550000 6100000,530000 6100000))';
var polygonContainingSecondAddress = 'POLYGON((550000 6100000,550000 6300000,570000 6300000,570000 6100000,550000 6100000))';

var temaObjects = {
  zone: {"zone": 1},
  politikreds: {"kode": 99, "navn": "Politikreds test"},
  region: {"kode": 99, "navn": "Region test"},
  kommune: {"kode": 99, "navn": "Kommune test", "regionskode": 99},
  postnummer: {"nr": 99, "navn": "Postdistrikt test"},
  sogn: {"kode": 99, "navn": "Sogn test"},
  opstillingskreds: {"kode": 99, "navn": "Opstillingskreds test"},
  retskreds: {"kode": 99, "navn": "retskreds test"}
};

const bebyggelseJsonContainingFirstAddress = {
  "name": "Bebyggelse", "type": "FeatureCollection"
  , "crs": {"type": "name", "properties": {"name": "EPSG:25832"}}
  , "features": [
    {
      "type": "Feature",
      "geometry": WKT.parse(polygonContainingFirstAddress),
      "properties": {
        "OBJECTID": 145053,
        "ID_LOKALID": "12337669-a241-6b98-e053-d480220a5a3f",
        "REGISTRERINGFRA": "2015-03-26T16:33:21",
        "SKRIVEMAADE": "Sønderhede",
        "BEBYGGELSESTYPE": "spredtBebyggelse",
        "BEBYGGELSESKODE": null,
        "AREAL": 821951,
        "DANMARKSSTATISTIK": "ukendt"
      }
    }]
};
const bebyggelseJsonContainingSecondAdresses = (() => {
  const json = JSON.parse(JSON.stringify(bebyggelseJsonContainingFirstAddress));
  json.features[0].geometry = WKT.parse(polygonContainingSecondAddress);
  return json;
})();

function asTextStream(json) {
  var s = new Readable();
  s.push(JSON.stringify(json));
  s.push(null);
  return s;
}

const loadFlatFns = {
  bebyggelse: {
    load1: (client) =>
      importBebyggelserImpl.importBebyggelserFromStream(
        client,
        asTextStream(bebyggelseJsonContainingFirstAddress), true, false)
    ,
    load2: (client) =>
      importBebyggelserImpl.importBebyggelserFromStream(
        client,
        asTextStream(bebyggelseJsonContainingSecondAdresses), false, false)

  },
  jordstykke: {
    load1: client =>
      importJordstykkerImpl.importEjerlav(client, __dirname, '60851_testmatrikel1.gml.zip', true),
    load2: client =>
      importJordstykkerImpl.importEjerlav(client, __dirname, '60851_testmatrikel2.gml.zip', false, true)
  }
};

// how we expect the keys to be formatted when returned
var expectedKeys = {
  zone: ['Byzone'],
  politikreds: ['0099'],
  region: ['0099'],
  kommune: ['0099'],
  postnummer: ['0099'],
  sogn: ['0099'],
  opstillingskreds: ['0099'],
  retskreds: ['0099']
};

const expectedFlatResults1 = {
  bebyggelse: [{
    adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb3546800',
    bebyggelsesid: '12337669-a241-6b98-e053-d480220a5a3f'
  }],
  jordstykke: [{
    adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb3546800',
    ejerlavkode: 60851,
    matrikelnr: '2c'
  }]
};

const expectedFlatResults2 = {
  bebyggelse: [{
    adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb354680f',
    bebyggelsesid: '12337669-a241-6b98-e053-d480220a5a3f'
  }],
  jordstykke: [{
    adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb354680f',
    ejerlavkode: 60851,
    matrikelnr: '2c'
  }]
};

describe('Replikering af tilknytninger', function () {
  testdb.withTransactionEach('empty', function (clientFn) {

    // insert the two adresses
    adgangsadresser.forEach(function (adgangsadresse) {
      beforeEach(function () {
        var client = clientFn();
        var datamodel = datamodels.adgangsadresse;
        var sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
        return q.nfcall(crud.create, client, datamodel, sqlObject);
      });
    });


    _.each(temaObjects, function (temaObject, temaName) {
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

      function expectedResultForKey(expectedTemaKeyParts, adgangsadresseId) {
        var keyFieldNames = tilknytning.keyFieldNames;
        var expectedResult = {
          adgangsadresseid: adgangsadresseId
        };
        expectedTemaKeyParts.forEach(function (expectedKey, index) {
          expectedResult[keyFieldNames[index]] = expectedKey;
        });
        return expectedResult;
      }

      it('Skal replikere adgangsadressetilknytninger for ' + temaName, q.async(function*() {
        var client = clientFn();
        yield tema.addTema(client, {
          tema: temaName,
          fields: temaObject,
          polygons: [polygonContainingFirstAddress]
        });
        yield tema.updateAdresserTemaerView(client, temaDef, true);
        let jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
        let expectedResult = expectedResultForKey(expectedKeys[temaName], adgangsadresser[0].id);
        expect(jsonResult).to.deep.equal([expectedResult]);

        yield tema.updateTema(client, temaDef, {
          tema: temaName,
          fields: temaObject,
          polygons: [polygonContainingSecondAddress]
        });
        yield tema.updateAdresserTemaerView(client, temaDef, false);
        jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
        expectedResult = expectedResultForKey(expectedKeys[temaName], adgangsadresser[1].id);
        expect(jsonResult).to.deep.equal([expectedResult]);
        let eventResult = yield helpers.getJson(client, eventResource, {}, {});
        expect(eventResult.length).to.equal(2);
        expect(eventResult[0].operation).to.equal('delete');
        expect(eventResult[1].operation).to.equal('insert');
        expect(eventResult[0].data.adgangsadresseid).to.equal(adgangsadresser[0].id);
        expect(eventResult[1].data.adgangsadresseid).to.equal(adgangsadresser[1].id);
        var keyFieldNames = tilknytning.keyFieldNames;
        keyFieldNames.forEach(function (keyFieldName, index) {
          expect(eventResult[0].data[keyFieldName]).to.equal(expectedKeys[temaName][index]);
          expect(eventResult[1].data[keyFieldName]).to.equal(expectedKeys[temaName][index]);
        });

        var eventRepresentation = registry.findWhere({
          entityName: datamodelName + '_hændelse',
          type: 'representation',
          qualifier: 'json'
        });

        var eventSchema = eventRepresentation.schema;
        expect(schemaValidationUtil.isSchemaValid(eventResult[0], eventSchema)).to.be.true;
        expect(schemaValidationUtil.isSchemaValid(eventResult[1], eventSchema)).to.be.true;
      }));
    });

    describe('Replikering af flat-tilknytninger', () => {
      Object.keys(flatTilknytninger).forEach(flatName => {
        const flat = flats[flatName];
        const tilknytningName = flat.prefix + 'tilknytning';
        const udtraekResource = registry.findWhere({
          entityName: tilknytningName,
          type: 'resource',
          qualifier: 'udtraek'
        });
        const eventResource = registry.findWhere({
          entityName: tilknytningName,
          type: 'resource',
          qualifier: 'hændelser'
        });

        it('Skal replikere adgangsadressetilknytninger for ' + flatName, q.async(function*() {
          var client = clientFn();
          yield loadFlatFns[flatName].load1(client);
          let jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
          expect(jsonResult).to.deep.equal(expectedFlatResults1[flatName]);
          yield loadFlatFns[flatName].load2(client);
          jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
          expect(jsonResult).to.deep.equal(expectedFlatResults2[flatName]);
          const tilknytningName = flat.prefix + 'tilknytning';
          const eventRepresentation = registry.findWhere({
            entityName: tilknytningName + '_hændelse',
            type: 'representation',
            qualifier: 'json'
          });
          const eventSchema = eventRepresentation.schema;
          const eventResult = yield helpers.getJson(client, eventResource, {}, {});
          expect(schemaValidationUtil.isSchemaValid(eventResult[0], eventSchema)).to.be.true;
          expect(schemaValidationUtil.isSchemaValid(eventResult[1], eventSchema)).to.be.true;
        }));

      });
    });
  });
});
