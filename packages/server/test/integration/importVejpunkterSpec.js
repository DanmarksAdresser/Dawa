"use strict";

const { go } = require('ts-csp');
const { assert } = require('chai');

const testdb = require('@dawadk/test-util/src/testdb');
const importVejpunkterImpl = require('../../vejpunkter/importVejpunkterImpl');
const { withImportTransaction } = require('../../importUtil/transaction-util');
const path = require('path');

describe('Vejpunkter import', () => {
  testdb.withTransactionEach('empty', clientFn => {
    it('Importerer vejpunkter', () => go(function*() {
      yield withImportTransaction(clientFn(), 'test import vejpunkter', (txid) => go(function*() {
        yield importVejpunkterImpl(clientFn(), txid, path.join(__dirname, 'vejpunkter.txt'));
      }));
      const changes1 = yield clientFn().queryRows('select * from vejpunkter_changes');
      assert.strictEqual(changes1.length, 0);
      const result = yield clientFn().queryRows('select * from vejpunkter');
      assert.strictEqual(result.length, 9);
      assert.strictEqual(result[0].tekniskstandard, 'V0');
      assert.isOk(result[0].geom);
      assert.isOk(result[0].id);
      assert.isOk(result[0].noejagtighedsklasse);
      assert.isOk(result[0].husnummerid);
      assert.isOk(result[0].kilde);
      yield withImportTransaction(clientFn(), 'test import vejpunkter2', (txid) => go(function*() {
        yield importVejpunkterImpl(clientFn(), txid, path.join(__dirname, 'vejpunkter2.txt'));
      }));
      const changes2 = yield clientFn().queryRows('select * from vejpunkter_changes order by id');
      assert.strictEqual(changes2.length, 3);
      assert.isTrue(changes2[0].public);
      const ops = changes2.map(row => row.operation);
      assert(ops.includes('insert'));
      assert(ops.includes('update'));
      assert(ops.includes('delete'));
    }));
  });
});
