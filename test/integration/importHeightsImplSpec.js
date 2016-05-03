"use strict";

const expect = require('chai').expect;
const q = require('q');

const importFromApi = require('../../heights/importAdresseHeightsImpl').importFromApi;
var testdb = require('../helpers/testdb');

const successMockClient = () => q.resolve(4.2);
const failMockClient = () => q.reject('someError');

const FIRST_ADDRESS_WITHOUT_HEIGHT = '0a3f5089-7930-32b8-e044-0003ba298018';


describe('importFromApi', () => {
  testdb.withTransactionEach('test', clientFn=> {
    it('Can import a height from API', q.async(function*() {
      const previousHeight = (yield clientFn().queryp('select hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0].hoejde;
      expect(previousHeight).to.be.null;
      yield importFromApi(clientFn(), successMockClient);
      const after = (yield clientFn().queryp('select z_x, z_y, hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0];
      expect(after.hoejde).to.equal(4.2);
      expect(after.z_x).to.equal(590851.82);
      expect(after.z_y).to.equal(6140777.92);
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
