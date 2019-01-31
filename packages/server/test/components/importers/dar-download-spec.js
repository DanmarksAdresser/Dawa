"use strict";

const _ = require('underscore');
const {expect, assert} = require('chai');
const uuid = require('uuid');

const path = require('path');
const q = require('q');

const databaseTypes = require('@dawadk/common/src/postgres/types');
const dar10TableModels = require('../../../dar10/dar10TableModels');
const testdb = require('@dawadk/test-util/src/testdb');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const {importDownload} = require('../../../dar10/importDarImpl');
const { getMeta, getMaxEventId } = require('../../../dar10/import-dar-util')
const Range = databaseTypes.Range;

describe('DAR 1.0 tablemodels', () => {
  it('dar1_NavngivenVej geometrikolonner har distinctClause', () => {
    const column = _.findWhere(dar10TableModels.rawTableModels.NavngivenVej.columns, {name: 'vejnavnebeliggenhed_vejnavnelinje'});
    expect(column.distinctClause).to.exist;
  });
});

describe('Import af DAR 1.0 udtræk', function () {
  this.timeout(60000);
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Kan importere initielt udtræk', q.async(function* () {
      const client = clientFn();
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield importDownload(client, txid, path.join(__dirname, '../../data/dar10'));
      }));

      // check we actually imported some rows
      const queryResult = (yield client.queryp('select * from dar1_husnummer')).rows;
      expect(queryResult).to.have.length(7507);

      // check metadata has been updated
      const meta = yield getMeta(client);
      expect(meta.virkning).to.not.be.null;
      expect(meta.last_event_id).to.equal(643795);

      // check a transaction has been registered
      const transactions = (yield client.queryRows('SELECT * FROM transactions'));
      expect(transactions).to.have.length(1);
      const transaction = transactions[0];
      assert(transaction.txid);

      // check that DAWA entities has been created
      for (let dawaEntity of Object.keys(dar10TableModels.dawaMaterializations)) {
        const table = dar10TableModels.dawaMaterializations[dawaEntity].table;
        const count = (yield client.queryRows(`SELECT COUNT(*)::integer as c FROM ${table} `))[0].c;
        expect(count).to.be.greaterThan(1);
      }
      for(let table of ['vejstykker', 'navngivenvej', 'adgangsadresser', 'enhedsadresser']) {
        const count = (yield client.queryRows(`SELECT COUNT(*)::integer as c FROM ${table} `))[0].c;
        expect(count).to.be.greaterThan(1);
      }
    }));

    it('Kan finde højeste eventid i udtræk', q.async(function* () {
      const client = clientFn();
      yield client.queryp(`INSERT INTO dar1_adresse(rowkey, id, eventopret, registrering, virkning, status, husnummer_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        1, uuid.v4(), 42, new Range(null, null, '()'), new Range(null, null, '()'), 1, uuid.v4()
      ]);
      const maxEventId = yield getMaxEventId(client, '');
      expect(maxEventId).to.equal(42);
    }));
  });
});
