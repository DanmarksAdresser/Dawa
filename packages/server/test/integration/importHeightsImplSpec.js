"use strict";

const { go } = require('ts-csp');
const { expect, assert } = require('chai');
const path = require('path');
const Promise = require('bluebird');

const testdb = require('@dawadk/test-util/src/testdb');

const {importFromApi, importHeights } = require('../../heights/importAdresseHeightsImpl');
const {withImportTransaction} = require('../../importUtil/transaction-util');

const successMockClient = () => Promise.resolve(4.22);
const failMockClient = () => Promise.reject(new Error('someError'));
const FIRST_ADDRESS_WITHOUT_HEIGHT = '04b3fd1d-48f0-4f80-89df-88b322a84f23';

describe('importFromApi', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('Can import a height from API', () => go(function* () {
      const previousHeight = yield clientFn().queryRows('select hoejde from hoejder where husnummerid = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]);
      assert.strictEqual(previousHeight.length, 0);
      yield importFromApi(clientFn(), successMockClient);
      const after = (yield clientFn().queryRows('select hoejde from hoejder where husnummerid = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]))[0];
      expect(after.hoejde).to.equal(4.2);
      const importResult = (yield clientFn().queryRows(
        `select husnummerid, st_astext(position) as position, hoejde 
        from hoejde_importer_resultater
        where husnummerid=$1`, [FIRST_ADDRESS_WITHOUT_HEIGHT]))[0];
      assert.deepStrictEqual(importResult, {
        "hoejde": 4.2,
        "husnummerid": "04b3fd1d-48f0-4f80-89df-88b322a84f23",
        "position": "POINT(727573.77 6174825.75)"
      });
      const importPending = yield clientFn().queryRows(
        `select * from hoejde_importer_afventer
        where husnummerid=$1`, [FIRST_ADDRESS_WITHOUT_HEIGHT]);
      assert.strictEqual(importPending.length, 0);

    }));

    it('If importing height fails, we will mark the point to not be queried again for 1 day', () => go(function*() {
      const previousHeight = yield clientFn().queryRows('select hoejde from hoejder where husnummerid = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]);
      assert.strictEqual(previousHeight.length, 0);
      yield importFromApi(clientFn(), failMockClient);
      const pendingResult = (yield clientFn().queryRows('select * from hoejde_importer_disabled where husnummerid = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]))[0];
      expect(pendingResult.disableuntil).to.be.a('string');
    }));
  });
});

describe('Import from CSV', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('Can perform initial import of højde', () => go(function*() {
      const CSV_POINTS = {
        '0a3f5089-792a-32b8-e044-0003ba298018': 2.8,
        '0a3f5089-792c-32b8-e044-0003ba298018': 2.8
      };
      yield withImportTransaction(clientFn(), "test", txid =>
        importHeights(clientFn(), txid, path.join(__dirname, 'hoejder.csv')));
      const result = (yield clientFn().queryRows(`select id, etrs89oest, etrs89nord, hoejde from adgangsadresser where id in ('${Object.keys(CSV_POINTS).join("', '")}')`));
      expect(result).to.have.length(2);
      expect(result[0].hoejde).to.equal(CSV_POINTS[result[0].id]);
      expect(result[1].hoejde).to.equal(CSV_POINTS[result[1].id]);
    }));
  });
});
