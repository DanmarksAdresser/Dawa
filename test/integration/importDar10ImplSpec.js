"use strict";

const expect = require('chai').expect;

const path = require('path');
const q = require('q');

const importDarImpl = require('../../dar10/importDarImpl');
const testdb = require('../helpers/testdb');

describe('Import af DAR 1.0 udtræk', () => {
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Kan importere initielt udtræk', q.async(function*() {
      const client = clientFn();
      yield importDarImpl.importInitial(client, path.join(__dirname, '../data/dar10'));
      const queryResult = (yield client.queryp('select * from dar1_husnummer')).rows;
      expect(queryResult).to.have.length(100);
    }));
  });
});
