"use strict";

const expect = require('chai').expect;
const q = require('q');

const importFromApi = require('../../heights/importAdresseHeightsImpl').importFromApi;
var testdb = require('../helpers/testdb');

const  successMockClient = () => q(4.2);

const FIRST_ADDRESS_WITHOUT_HEIGHT = '0a3f5089-792a-32b8-e044-0003ba298018';

describe('importFromApi', () => {
  testdb.withTransactionEach('test', clientFn=> {
    it('Can import a height from API', () => {
      return q.async(function*() {
        const previousHeight = (yield clientFn().queryp('select hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0].hoejde;
        expect(previousHeight).to.be.null;
        yield importFromApi(clientFn(), successMockClient());
        const after = (yield clientFn().queryp('select x_z, y_z, hoejde from adgangsadresser where id = $1', [FIRST_ADDRESS_WITHOUT_HEIGHT])).rows[0];
        expect(after.hoejde).to.be(4.2);
        expect(after.x_z).to.be(590795.02);
        expect(after.y_z).to.be(6140774.41);
      });
    });
  });
});
