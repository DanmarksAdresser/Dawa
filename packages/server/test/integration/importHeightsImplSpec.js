"use strict";

const { go } = require('ts-csp');
const expect = require('chai').expect;
const path = require('path');
const Promise = require('bluebird');

const testdb = require('@dawadk/test-util/src/testdb');

const {importFromApi, importHeights } = require('../../heights/importAdresseHeightsImpl');
const {withImportTransaction} = require('../../importUtil/transaction-util');

const successMockClient = () => Promise.resolve(4.22);
const failMockClient = () => Promise.reject(new Error('someError'));
const FIRST_ADDRESS_WITHOUT_HEIGHT = '0a3f507b-ba08-32b8-e044-0003ba298018';
const FIRST_ADDRESS_X=728516.25;
const FIRST_ADDRESS_Y=6166987.04;


describe('importFromApi', () => {
  testdb.withTransactionEach('test', clientFn=> {
    it('Can import a height from API', () => go(function*() {
      const previousHeight = (yield clientFn().queryp('select hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0].hoejde;
      expect(previousHeight).to.be.null;
      yield importFromApi(clientFn(), successMockClient);
      const after = (yield clientFn().queryRows('select z_x, z_y, hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]))[0];
      expect(after.hoejde).to.equal(4.2);
      expect(after.z_x).to.equal(FIRST_ADDRESS_X);
      expect(after.z_y).to.equal(FIRST_ADDRESS_Y);
      const after_mat = (yield clientFn().queryRows('select hoejde from adgangsadresser_mat where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT]))[0];
      expect(after_mat.hoejde).to.equal(4.2);
    }));

    it('If importing height fails, we will mark the point to not be queried again for 1 day', () => go(function*() {
      const previousHeight = (yield clientFn().queryp('select hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0].hoejde;
      expect(previousHeight).to.be.null;
      yield importFromApi(clientFn(), failMockClient);
      const after = (yield clientFn().queryp('select hoejde, disableheightlookup from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0];
      expect(after.hoejde).to.be.null;
      expect(after.disableheightlookup).to.be.a('string');
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
        importHeights(clientFn(), txid, path.join(__dirname, 'hoejder.csv'), true));
      const result = (yield clientFn().queryRows(`select id, etrs89oest, etrs89nord, z_x, z_y, hoejde from adgangsadresser where id in ('${Object.keys(CSV_POINTS).join("', '")}')`));
      expect(result).to.have.length(2);
      expect(result[0].hoejde).to.equal(CSV_POINTS[result[0].id]);
      expect(result[1].hoejde).to.equal(CSV_POINTS[result[1].id]);
      expect(result[0].z_x).to.be.a('number');
      expect(result[0].z_y).to.be.a('number');
    }));
  });
});
