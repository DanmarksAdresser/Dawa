"use strict";

const expect = require('chai').expect;
const uuid = require('uuid');

const path = require('path');
const q = require('q');

const importDarImpl = require('../../dar10/importDarImpl');
const testdb = require('../helpers/testdb');
const Range = require('../../psql/databaseTypes').Range;

describe('Import af DAR 1.0 udtræk', () => {
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Kan importere initielt udtræk', q.async(function*() {
      const client = clientFn();
      yield importDarImpl.importInitial(client, path.join(__dirname, '../data/dar10'));

      // check we actually imported some rows
      const queryResult = (yield client.queryp('select * from dar1_husnummer')).rows;
      expect(queryResult).to.have.length(3552);

      // check metadata has been updated
      const meta = yield importDarImpl.internal.getMeta(client);
      expect(meta.virkning).to.not.be.null;
      expect(meta.current_tx).to.be.null;
      expect(meta.last_event_id).to.equal(0);

      // check a transaction has been registered
      const transactions = (yield client.queryp('SELECT * FROM dar1_transaction')).rows;
      expect(transactions).to.have.length(1);
      const transaction = transactions[0];
      expect(transaction.id).to.equal(1);
      expect(transaction.ts).to.not.be.null;
      expect(transaction.dawa_seq_range).to.not.be.null;
    }));

    it('Kan finde højeste eventid i udtræk', q.async(function*() {
      const client = clientFn();
      yield client.queryp(`INSERT INTO dar1_adresse(rowkey, id, eventopret, registrering, virkning, status, husnummer_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        1, uuid.v4(), 42, new Range(null, null, '()'), new Range(null, null, '()'), 1, uuid.v4()
      ]);
      const maxEventId = yield importDarImpl.internal.getMaxEventId(client, '');
      expect(maxEventId).to.equal(42);
    }));
  });
});
