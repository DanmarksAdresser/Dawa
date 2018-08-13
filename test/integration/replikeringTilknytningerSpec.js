"use strict";

// dette er en integrationstest af adressetilknytninger. Vi opretter nogle adresser og indlæser nogle temaer,
// hvorefter vi verificerer at de forventede tilknytninger udstilles korrekt både som udtræk og hændelser.

const expect = require('chai').expect;
const q = require('q');
const _ = require('underscore');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../importUtil/importUtil');
const tableDiffNg = require('../../importUtil/tableDiffNg');
const schemaModel = require('../../psql/tableModel');
const {internal: {doDawaChanges, materializeDawa}} = require('../../darImport/importDarImpl');

const registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

const Husnr = require('../../psql/databaseTypes').Husnr;
const testdb = require('../helpers/testdb2');
const temaModels = require('../../dagiImport/temaModels');
const {importSingleTema} = require('../../dagiImport/importDagiImpl');

const schemaValidationUtil = require('./schemaValidationUtil');

const helpers = require('./helpers');

const adgangsadresser = [
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

const coordinatesContainingFirstAddress = '((530000 6100000,530000 6300000,550000 6300000,550000 6100000,530000 6100000))';
const coordinatesContainingSecondAddress = '((550000 6100000,550000 6300000,570000 6300000,570000 6100000,550000 6100000))';
const multiContainingFirst = `SRID=25832;MULTIPOLYGON(${coordinatesContainingFirstAddress})`;
const multiContainingSecond = `SRID=25832;MULTIPOLYGON(${coordinatesContainingSecondAddress})`;

const temaObjects = {
  zone: [{"zone": 1}, {zone: 3}],
  politikreds: [{dagi_id: 1, "kode": 99, "navn": "Politikreds 1"}, {dagi_id: 2, kode: 100, navn: "Politikreds 2"}],
  region: [{dagi_id: 3, "kode": 99, "navn": "Region 1"}, {dagi_id: 4, kode: 100, navn: "Region 2"}],
  kommune: [{dagi_id: 5, "kode": 99, "navn": "Kommune 1", "regionskode": 99}, {dagi_id: 6, kode: 100, navn: "Kommune 2", regionskode: 100}],
  postnummer: [{dagi_id: 7, "nr": 99, "navn": "Postdistrikt 1"}, {dagi_id: 8, "nr": 100, "navn": "Postdistrikt 2"}],
  sogn: [{dagi_id: 9, "kode": 99, "navn": "Sogn 1"}, {dagi_id: 10, kode: 100, "navn": "Sogn 2"}],
  opstillingskreds: [{dagi_id: 11, "kode": 99, nummer: 99, "navn": "Opstillingskreds 1", valgkredsnummer: 1, storkredsnummer: 2},
    {dagi_id: 12, kode: 100, nummer: 100, navn: "Opstillingskreds 2", valgkredsnummer: 2, storkredsnummer: 2}],
  retskreds: [{dagi_id: 13, "kode": 99, "navn": "Retskreds 1"}, {dagi_id: 14, kode: 100, navn: "Retskreds 2"}]
};

// how we expect the keys to be formatted when returned
const expectedKeys = {
  zone: [['Byzone'], ['Sommerhusområde']],
  politikreds: [['0099'], ['0100']],
  region: [['0099'], ['0100']],
  kommune: [['0099'], ['0100']],
  postnummer: [['0099'], ['0100']],
  sogn: [['0099'], ['0100']],
  opstillingskreds: [['0099'], ['0100']],
  retskreds: [['0099'], ['0100']]
};

const loadAdresser = (client, adgangsadresser) => go(function* () {
  yield withImportTransaction(client, 'test', txid => go(function* () {
    for(let adgangsadresse of adgangsadresser) {
      const sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
      yield tableDiffNg.insert(client, txid, schemaModel.tables.adgangsadresser, sqlObject);
    }
    yield doDawaChanges(client, txid);
    yield materializeDawa(client, txid);
  }));
});

describe('Replikering af tilknytninger', function () {
  testdb.withTransactionEach('empty', function (clientFn) {

    _.each(temaObjects, function (temaObject, temaName) {
      const temaModel = temaModels.modelMap[temaName];
      const udtraekResource = registry.findWhere({
        entityName: temaModel.tilknytningName,
        type: 'resource',
        qualifier: 'udtraek'
      });
      const eventResource = registry.findWhere({
        entityName: temaModel.tilknytningName,
        type: 'resource',
        qualifier: 'hændelser'
      });

      const checkResult = (temaModel, result, expectedKeys) => {
        const resultMap = _.indexBy(result, "adgangsadresseid");
        let expectedResultMap = _.zip(adgangsadresser, expectedKeys).reduce((memo, [adgAdr, expectedKeyValues]) => {
          const expectedResult = _.zip(temaModel.tilknytningKey, expectedKeyValues).reduce((memo, [key, val]) => {
            memo[key] = val;
            return memo;
          }, {adgangsadresseid: adgAdr.id});
          memo[adgAdr.id] = expectedResult;
          return memo;
        }, {});
        expect(resultMap).to.deep.equal(expectedResultMap);
      };
      it('Skal replikere adgangsadressetilknytninger for ' + temaName, q.async(function* () {
        const client = clientFn();
        const temaModel = temaModels.modelMap[temaName];
        const temaData = temaObjects[temaName].map(tema => Object.assign({}, tema));
        temaData[0].geom = multiContainingFirst;
        temaData[1].geom = multiContainingSecond;
        const temaDataSwapped = temaObjects[temaName].map(tema => Object.assign({}, tema));
        temaDataSwapped[1].geom = multiContainingFirst;
        temaDataSwapped[0].geom = multiContainingSecond;
        yield withImportTransaction(client, 'test', txid =>
          importSingleTema(client, txid, temaModel,
            temaData, 1000000));

        yield loadAdresser(client, adgangsadresser);

        let jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
        checkResult(temaModel, jsonResult, expectedKeys[temaName]);
        yield withImportTransaction(client, 'test', txid =>
          importSingleTema(client, txid, temaModel,
            temaDataSwapped, 1000000));
        const reversedResult = yield helpers.getJson(client, udtraekResource, {}, {});
        checkResult(temaModel, reversedResult, expectedKeys[temaName].slice().reverse());
        let eventResult = yield helpers.getJson(client, eventResource, {}, {});
        expect(eventResult.length).to.equal(6); // each is inserted twice and deleted once
        const eventsForFirstAddr = eventResult.filter(event => event.data.adgangsadresseid === adgangsadresser[0].id);
        expect(eventsForFirstAddr.length).to.equal(3); // each is inserted twice and deleted once
        expect(eventsForFirstAddr.map(event => event.operation)).to.deep.equal(['insert', 'delete', 'insert']);
        const keyFieldNames = temaModel.tilknytningKey;
        keyFieldNames.forEach(function (keyFieldName, index) {
          expect(eventsForFirstAddr[0].data[keyFieldName]).to.equal(expectedKeys[temaName][0][index]);
          expect(eventsForFirstAddr[2].data[keyFieldName]).to.equal(expectedKeys[temaName][1][index]);
        });

        const eventRepresentation = registry.findWhere({
          entityName: temaModel.tilknytningName + '_hændelse',
          type: 'representation',
          qualifier: 'json'
        });

        const eventSchema = eventRepresentation.schema;
        expect(schemaValidationUtil.isSchemaValid(eventResult[0], eventSchema)).to.be.true;
        expect(schemaValidationUtil.isSchemaValid(eventResult[1], eventSchema)).to.be.true;
      }));
    });
  });
});
