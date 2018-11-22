"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');

const helpers = require('./helpers');
const resource = require('../../apiSpecification/history2/resources');
const testdb = require('@dawadk/test-util/src/testdb');

describe('darhistory', () => {
  testdb.withTransactionEach('test', (clientFn) => {
    it('Får fejl 404 hvis der hentes en entitet som ikke findes', () => go(function* () {
      const result = yield helpers.getResponse(clientFn(), resource, {}, {
        id: '0cb22adb-a6d6-4889-a440-4811ded6db34',
        entitet: 'navngivenvej'
      });
      assert.strictEqual(result.status, 404);
    }));

    it('Kan hente historik for navngiven vej', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), resource, {}, {
        id: '6cb22adb-a6d6-4889-a440-4811ded6db34',
        entitet: 'navngivenvej'
      });
      assert.strictEqual(result.aktuelværdi.navngivenvej_id, '6cb22adb-a6d6-4889-a440-4811ded6db34');
    }));
    it('Kan hente historik for husnummer', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), resource, {}, {
        id: '0a3f5089-a6c1-32b8-e044-0003ba298018',
        entitet: 'husnummer'
      });
      assert.strictEqual(result.aktuelværdi.husnummer_id, '0a3f5089-a6c1-32b8-e044-0003ba298018');
      assert.strictEqual(result.initielværdi.husnummer_id, '0a3f5089-a6c1-32b8-e044-0003ba298018');
      assert.strictEqual(result.historik.length, 5);
      const firstChange = result.historik[0];
      assert.strictEqual(firstChange.ændringstidspunkt, '2012-01-18T06:48:32.710Z');
      for(let change of result.historik) {
        assert(change.ændringer.length > 0);
      }
    }));
    it('Kan hente historik for adresse', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), resource, {}, {
        id: '0a3f50b4-960b-32b8-e044-0003ba298018',
        entitet: 'adresse'
      });
      assert.strictEqual(result.aktuelværdi.adresse_husnummer_id, '0a3f5089-a6c1-32b8-e044-0003ba298018');
      assert.strictEqual(result.initielværdi.adresse_husnummer_id, '0a3f5089-a6c1-32b8-e044-0003ba298018');
      assert.strictEqual(result.aktuelværdi.adresse_id, '0a3f50b4-960b-32b8-e044-0003ba298018');
      assert.strictEqual(result.initielværdi.adresse_id, '0a3f50b4-960b-32b8-e044-0003ba298018');
      assert.strictEqual(result.historik.length, 5);
      const firstChange = result.historik[0];
      assert.strictEqual(firstChange.ændringstidspunkt, '2012-01-18T06:48:32.710Z');
      for(let change of result.historik) {
        assert(change.ændringer.length > 0);
      }
    }));
    it('Leverer adressebetegnelsesfelt for husnummer', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), resource, {}, {
        id: '0a3f5089-a6c1-32b8-e044-0003ba298018',
        entitet: 'husnummer',
        attributter: 'adressebetegnelse'
      });
      assert.strictEqual(result.aktuelværdi.adressebetegnelse, 'Rugårdsvej 2, Villestofte, 5210 Odense NV');
    }));
    it('Leverer adressebetegnelsesfelt for adresse', () => go(function* () {
      const result = yield helpers.getJson(clientFn(), resource, {}, {
        id: '01ffcb65-c425-4cee-9145-bef6570f34bb',
        entitet: 'adresse',
        attributter: 'adressebetegnelse'
      });
      assert.strictEqual(result.aktuelværdi.adressebetegnelse, 'Ridehusgade 49, 2. th, 5000 Odense C');
    }));
  });
});

