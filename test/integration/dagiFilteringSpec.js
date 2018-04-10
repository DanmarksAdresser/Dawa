"use strict";

const expect = require('chai').expect;
const {go} = require('ts-csp');

const registry = require('../../apiSpecification/registry');
const resourceImpl = require('../../apiSpecification/common/resourceImpl');
const testdb = require('../helpers/testdb2');

const {withImportTransaction} = require('../../importUtil/importUtil');
const {importSingleTema} = require('../../dagiImport/importDagiImpl');
const temaModels = require('../../dagiImport/temaModels');


require('../../apiSpecification/allSpecs');


describe('Filtrering af adresser ud fra DAGI tema kode', function () {
  // der er 390 adgangsadresser inden for denne polygon
  const xmin = 500000;
  const xmax = 1500000;
  const ymin = 5000000;
  const ymax = 7500000;
  const containingRingCounterclockwise = `(${xmin} ${ymin},${xmax} ${ymin},${xmax} ${ymax},${xmin} ${ymax},${xmin} ${ymin})`;
  const temaRingPointsClockwise = ['725025.17 6166264.36', '725025.17 6167537.77', '731289.61 6167537.77', '731289.61 6166264.36', '725025.17 6166264.36'];
  const temaRingClockwise = `(${temaRingPointsClockwise.join(', ')})`;
  const temaRingCounterclockwise = `(${temaRingPointsClockwise.reverse().join(', ')})`;
  const temaGeom = `SRID=25832;MULTIPOLYGON((${temaRingCounterclockwise}))`;
  const nonTemaGeom = `SRID=25832;MULTIPOLYGON((${containingRingCounterclockwise},${temaRingClockwise}))`;
  const kodeNavnSampleTemas = [{
    dagi_id: 1,
    kode: 10,
    navn: 'Test tema',
    geom: temaGeom
  }, {
    dagi_id: 2,
    kode: 11,
    navn: 'Udenfor test tema',
    geom: nonTemaGeom
  }];
  const sampleTemas = {
    sogn: kodeNavnSampleTemas,
    retskreds: kodeNavnSampleTemas,
    politikreds: kodeNavnSampleTemas,
    opstillingskreds: kodeNavnSampleTemas.map(tema => Object.assign({}, tema, {nummer: tema.kode, valgkredsnummer: 1, storkredsnummer: 1})),
    zone: [{
      zone: 1,
      geom: temaGeom
    }, {
      zone: 3,
      geom: nonTemaGeom
    }]
  };

  const sampleParams = {
    sogn: {sognekode: "10"},
    retskreds: {retskredskode: "10"},
    politikreds: {politikredskode: "10"},
    opstillingskreds: {opstillingskredskode: "10"},
    zone: {zonekode: "1"}
  };

  const expectedResultsInner = {
    adgangsadresse: 281,
    adresse: 283
  };

  ['adgangsadresse', 'adresse'].forEach(function (entityName) {
    const resourceSpec = registry.findWhere({
      entityName: entityName,
      type: 'resource',
      qualifier: 'query'
    });
    for (let temaName of Object.keys(sampleTemas)) {
      const temaModel = temaModels.modelMap[temaName];
      it(`For ${temaName} på ${entityName}`, function()  {
        this.timeout = 10000;
        return go(function*() {
          const sampleTema = sampleTemas[temaName];
          yield testdb.withTransaction('test', 'ROLLBACK', client => go(function* () {
            yield withImportTransaction(client, 'test', (txid) => go(function* () {
              yield importSingleTema(client, txid, temaModel, sampleTema, 1000000);
            }));
            const params = sampleParams[temaName];
            const processedParams = resourceImpl.internal.parseAndProcessParameters(resourceSpec, [], params).processedParams;
            const result = yield resourceSpec.sqlModel.processQuery(client, ['id'], processedParams);
            expect(result.length).to.equal(expectedResultsInner[entityName]);
          }));
        });
      });
    }
  });
});
