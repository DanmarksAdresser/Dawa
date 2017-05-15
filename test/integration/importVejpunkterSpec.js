"use strict";

const { go } = require('ts-csp');
const { assert } = require('chai');

const testdb = require('../helpers/testdb2');
const importVejpunkterImpl = require('../../vejpunkter/importVejpunkterImpl');
const { withImportTransaction } = require('../../importUtil/importUtil');
const path = require('path');

describe('Vejpunkter import', () => {
  testdb.withTransactionEach('empty', clientFn => {
    it('Importerer vejpunkter', () => go(function*() {
      yield withImportTransaction(clientFn(), 'test import vejpunkter', (txid) => go(function*() {
        yield importVejpunkterImpl(clientFn(), txid, path.join(__dirname, 'vejpunkter.txt'));
      }));
      const changes = yield clientFn().queryRows('select * from vejpunkter_changes');
      assert.strictEqual(changes.length, 10);
      assert.isTrue(changes[0].public);
      assert.strictEqual(changes[0].tekniskstandard, 'V0');
      assert.isOk(changes[0].geom);
      assert.isOk(changes[0].id);
      assert.isOk(changes[0].noejagtighedsklasse);
      assert.isOk(changes[0].husnummerid);
      assert.isOk(changes[0].kilde);
      const result = yield clientFn().queryRows('select * from vejpunkter');
      assert.strictEqual(result.length, 10);
    }));
  });
});
