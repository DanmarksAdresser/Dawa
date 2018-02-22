"use strict";

// dette er en integrationstest af adressetilknytninger. Vi opretter nogle adresser og indlæser nogle temaer,
// hvorefter vi verificerer at de forventede tilknytninger udstilles korrekt både som udtræk og hændelser.

const expect = require('chai').expect;
const q = require('q');
// const Readable = require('stream').Readable;
// const WKT = require('terraformer-wkt-parser');
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
// const flats = require('../../apiSpecification/flats/flats');
// const flatTilknytninger = require('../../apiSpecification/flats/tilknytninger/tilknytninger');
// const importJordstykkerImpl = require('../../matrikeldata/importJordstykkerImpl');
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
// const polygonContainingFirstAddress = `POLYGON${coordinatesContainingFirstAddress}`;
// const polygonContainingSecondAddress = `POLYGON${coordinatesContainingSecondAddress}`;
const multiContainingFirst = `SRID=25832;MULTIPOLYGON(${coordinatesContainingFirstAddress})`;
const multiContainingSecond = `SRID=25832;MULTIPOLYGON(${coordinatesContainingSecondAddress})`;

const temaObjects = {
  zone: [{"zone": 1}, {zone: 3}],
  politikreds: [{"kode": 99, "navn": "Politikreds 1"}, {kode: 100, navn: "Politikreds 2"}],
  region: [{"kode": 99, "navn": "Region 1"}, {kode: 100, navn: "Region 2"}],
  kommune: [{"kode": 99, "navn": "Kommune 1", "regionskode": 99}, {kode: 100, navn: "Kommune 2", regionskode: 100}],
  postnummer: [{"nr": 99, "navn": "Postdistrikt 1"}, {"nr": 100, "navn": "Postdistrikt 2"}],
  sogn: [{"kode": 99, "navn": "Sogn 1"}, {kode: 100, "navn": "Sogn 2"}],
  opstillingskreds: [{"kode": 99, "navn": "Opstillingskreds 1"}, {kode: 100, navn: "Opstillingskreds 2"}],
  retskreds: [{"kode": 99, "navn": "Retskreds 1"}, {kode: 100, navn: "Retskreds 2"}]
};

// const bebyggelseJsonContainingFirstAddress = {
//   "name": "Bebyggelse", "type": "FeatureCollection"
//   , "crs": {"type": "name", "properties": {"name": "EPSG:25832"}}
//   , "features": [
//     {
//       "type": "Feature",
//       "geometry": WKT.parse(polygonContainingFirstAddress),
//       "properties": {
//         "OBJECTID": 145053,
//         "ID_LOKALID": "12337669-a241-6b98-e053-d480220a5a3f",
//         "REGISTRERINGFRA": "2015-03-26T16:33:21",
//         "SKRIVEMAADE": "Sønderhede",
//         "BEBYGGELSESTYPE": "spredtBebyggelse",
//         "BEBYGGELSESKODE": null,
//         "AREAL": 821951,
//         "DANMARKSSTATISTIK": "ukendt"
//       }
//     }]
// };
// const bebyggelseJsonContainingSecondAdresses = (() => {
//   const json = JSON.parse(JSON.stringify(bebyggelseJsonContainingFirstAddress));
//   json.features[0].geometry = WKT.parse(polygonContainingSecondAddress);
//   return json;
// })();
//
// function asTextStream(json) {
//   const s = new Readable();
//   s.push(JSON.stringify(json));
//   s.push(null);
//   return s;
// }

// const importEjerlav = (client, dir, file, initial, skipModificationCheck) => go(function* () {
//   yield importJordstykkerImpl.importEjerlav(client, dir, file, initial, skipModificationCheck);
//
//   yield withImportTransaction(client, 'importJordstykker', txid =>
//     importing.updateAdgangsadresserRelationNg(client, txid, 'jordstykke'));
// });

// const loadFlatFns = {
//   bebyggelse: {
//     load1: (client) =>
//       importBebyggelserImpl.importBebyggelserFromStream(
//         client,
//         asTextStream(bebyggelseJsonContainingFirstAddress), true, false)
//     ,
//     load2: (client) =>
//       importBebyggelserImpl.importBebyggelserFromStream(
//         client,
//         asTextStream(bebyggelseJsonContainingSecondAdresses), false, false)
//
//   },
//   jordstykke: {
//     load1: client => importEjerlav(client, __dirname, '60851_testmatrikel1.gml.zip', true),
//     load2: client =>
//       importEjerlav(client, __dirname, '60851_testmatrikel2.gml.zip', false, true),
//     loadOverlappende: client =>
//       importEjerlav(client, __dirname, '60851_overlappende.gml.zip', true),
//     updateOverlappende: client =>
//       importEjerlav(client, __dirname, '60851_overlappende.gml.zip', false)
//   }
// };

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

// const expectedFlatResults1 = {
//   bebyggelse: [{
//     adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb3546800',
//     bebyggelsesid: '12337669-a241-6b98-e053-d480220a5a3f'
//   }],
//   jordstykke: [{
//     adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb3546800',
//     ejerlavkode: 60851,
//     matrikelnr: '2c'
//   }]
// };
//
// const expectedFlatResults2 = {
//   bebyggelse: [{
//     adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb354680f',
//     bebyggelsesid: '12337669-a241-6b98-e053-d480220a5a3f'
//   }],
//   jordstykke: [{
//     adgangsadresseid: '038edf0e-001b-4d9d-a1c7-b71cb354680f',
//     ejerlavkode: 60851,
//     matrikelnr: '2c'
//   }]
// };


const loadAdresse = (client, adgangsadresse) => go(function* () {
  yield withImportTransaction(client, 'test', txid => go(function* () {
    const sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
    yield tableDiffNg.insert(client, txid, schemaModel.tables.adgangsadresser, sqlObject);
    yield doDawaChanges(client, txid);
    yield materializeDawa(client, txid);
  }));
});

// const updateAdresse = (client, adgangsadresse) => go(function* () {
//   yield withImportTransaction(client, 'test', txid => go(function* () {
//     const sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
//     yield tableDiffNg.update(client, txid, schemaModel.tables.adgangsadresser, sqlObject);
//     yield doDawaChanges(client, txid);
//     yield materializeDawa(client, txid);
//   }));
// });
//
// const deleteAdresse = (client, adgangsadresse) => go(function* () {
//   yield withImportTransaction(client, 'test', txid => go(function* () {
//     const sqlObject = helpers.toSqlModel('adgangsadresse', adgangsadresse);
//     yield tableDiffNg.del(client, txid, schemaModel.tables.adgangsadresser, sqlObject);
//     yield doDawaChanges(client, txid);
//     yield materializeDawa(client, txid);
//   }));
// });

// describe('Opdatering af tilknytninger', function () {
//   testdb.withTransactionAll('empty', function (clientFn) {
//     it('Når en adresse oprettes, skal jordstykket tilknyttes adressen', q.async(function* () {
//       const client = clientFn();
//       yield loadFlatFns.jordstykke.load1(client);
//       yield loadAdresse(client, adgangsadresser[0]);
//
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(1);
//       expect(result[0].adgangsadresse_id).to.equal(adgangsadresser[0].id);
//       expect(result[0].ejerlavkode).to.equal(60851);
//       expect(result[0].matrikelnr).to.equal('2c');
//     }));
//
//     it('Når adressen flytter udenfor jordstykket slettes tilknytningen', q.async(function* () {
//       const client = clientFn();
//       const adresseUdenfor = Object.assign({}, adgangsadresser[0], {"etrs89koordinat_nord": 6500000.00});
//       yield updateAdresse(client, adresseUdenfor);
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(0);
//     }));
//
//     it('Når adressen flytter indenfor oprettes tilknytningen igen', q.async(function* () {
//       const client = clientFn();
//       yield updateAdresse(client, adgangsadresser[0]);
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(1);
//       expect(result[0].adgangsadresse_id).to.equal(adgangsadresser[0].id);
//       expect(result[0].ejerlavkode).to.equal(60851);
//       expect(result[0].matrikelnr).to.equal('2c');
//     }));
//
//     it('Når adressen slettes fjernes tilknytingen', q.async(function* () {
//       const client = clientFn();
//       yield deleteAdresse(client, adgangsadresser[0]);
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(0);
//     }));
//   });
// });
//
// describe('Håndtering af overlappende jordstykker)', () => {
//   testdb.withTransactionEach('empty', clientFn => {
//     it('Hvis en adresse oprettes oven på to overlappende jordstykker skal kun et jordstykke tilknyttes', q.async(function* () {
//       const client = clientFn();
//       yield loadFlatFns.jordstykke.loadOverlappende(client);
//       yield loadAdresse(client, adgangsadresser[0]);
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(1);
//     }));
//
//     it('Hvis overlappende jordstykker indlæses tilknyttes eksisterende adresse kun til en', q.async(function* () {
//       const client = clientFn();
//       yield loadAdresse(client, adgangsadresser[0]);
//       yield loadFlatFns.jordstykke.updateOverlappende(client);
//       const result = (yield client.queryp('select * from jordstykker_adgadr')).rows;
//       expect(result).to.have.length(1);
//     }));
//   });
// });

describe('Replikering af tilknytninger', function () {
  testdb.withTransactionEach('empty', function (clientFn) {

    // insert the two adresses
    adgangsadresser.forEach(function (adgangsadresse) {
      beforeEach(function () {
        const client = clientFn();
        return loadAdresse(client, adgangsadresse);
      });
    });


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

    // describe('Replikering af flat-tilknytninger', () => {
    //   Object.keys(flatTilknytninger).forEach(flatName => {
    //     const flat = flats[flatName];
    //     const tilknytningName = flat.prefix + 'tilknytning';
    //     const udtraekResource = registry.findWhere({
    //       entityName: tilknytningName,
    //       type: 'resource',
    //       qualifier: 'udtraek'
    //     });
    //     const eventResource = registry.findWhere({
    //       entityName: tilknytningName,
    //       type: 'resource',
    //       qualifier: 'hændelser'
    //     });
    //
    //     it('Skal replikere adgangsadressetilknytninger for ' + flatName, q.async(function* () {
    //       const client = clientFn();
    //       yield loadFlatFns[flatName].load1(client);
    //       let jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
    //       expect(jsonResult).to.deep.equal(expectedFlatResults1[flatName]);
    //       yield loadFlatFns[flatName].load2(client);
    //       jsonResult = yield helpers.getJson(client, udtraekResource, {}, {});
    //       expect(jsonResult).to.deep.equal(expectedFlatResults2[flatName]);
    //       const tilknytningName = flat.prefix + 'tilknytning';
    //       const eventRepresentation = registry.findWhere({
    //         entityName: tilknytningName + '_hændelse',
    //         type: 'representation',
    //         qualifier: 'json'
    //       });
    //       const eventSchema = eventRepresentation.schema;
    //       const eventResult = yield helpers.getJson(client, eventResource, {}, {});
    //       expect(schemaValidationUtil.isSchemaValid(eventResult[0], eventSchema)).to.be.true;
    //       expect(schemaValidationUtil.isSchemaValid(eventResult[1], eventSchema)).to.be.true;
    //     }));
    //
    //   });
    // });
  });
});
