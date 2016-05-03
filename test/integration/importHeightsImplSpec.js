"use strict";

const expect = require('chai').expect;
const path = require('path');
const q = require('q');

const importAdresseHeightsImpl = require('../../heights/importAdresseHeightsImpl');
var testdb = require('../helpers/testdb');


const importFromApi = importAdresseHeightsImpl.importFromApi;
const importHeights = importAdresseHeightsImpl.importHeights;

const successMockClient = () => q.resolve(4.22);
const failMockClient = () => q.reject('someError');

const FIRST_ADDRESS_WITHOUT_HEIGHT = '0a3f5089-792a-32b8-e044-0003ba298018';


describe('importFromApi', () => {
  testdb.withTransactionEach('test', clientFn=> {
    it('Can import a height from API', q.async(function*() {
      const previousHeight = (yield clientFn().queryp('select hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0].hoejde;
      expect(previousHeight).to.be.null;
      yield importFromApi(clientFn(), successMockClient);
      const after = (yield clientFn().queryp('select z_x, z_y, hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0];
      expect(after.hoejde).to.equal(4.2);
      expect(after.z_x).to.equal(590795.02);
      expect(after.z_y).to.equal(6140774.41);
    }));

    it('If importing height fails, we will mark the point to not be queried again for 1 day', q.async(function*() {
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
    it('Can perform initial import of højde', q.async(function*() {
      const CSV_POINTS = {
        '0a3f5089-792a-32b8-e044-0003ba298018': 2.8,
        '0a3f5089-792c-32b8-e044-0003ba298018': 2.8
      };
      yield importHeights(clientFn(), path.join(__dirname, 'hoejder.csv'), true);
      const result = (yield clientFn().queryp(`select id, etrs89oest, etrs89nord, z_x, z_y, hoejde from adgangsadresser where id in ('${Object.keys(CSV_POINTS).join("', '")}')`)).rows;
      expect(result).to.have.length(2);
      expect(result[0].hoejde).to.equal(CSV_POINTS[result[0].id]);
      expect(result[1].hoejde).to.equal(CSV_POINTS[result[1].id]);
      expect(result[0].z_x).to.be.a('number');
      expect(result[0].z_y).to.be.a('number');
    }));
  });
});
