"use strict";

const { assert } = require('chai');
const { go } = require('ts-csp');
const testdb = require('../helpers/testdb2');

const tableModel = require('../../psql/tableModel');

const { computeInserts, computeUpdates, computeDeletes, computeDifferences }  = require('../../importUtil/tableDiffNg');

const ejerlavTableModel = tableModel.tables.ejerlav;
describe('tableDiffNg', () => {
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can compute inserts by diffing two tables', () => go(function*() {
      const client = clientFn();
      yield client.query(`INSERT INTO ejerlav(kode, navn) values (1, 'foo')`);
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select * from ejerlav)`);
      yield client.query(`INSERT INTO fetch_ejerlav(kode, navn) VALUES (2, 'bar')`);
      const txid = 1;
      yield computeInserts(client, txid, 'fetch_ejerlav', ejerlavTableModel);
      const result = yield client.queryRows('select * from ejerlav_changes');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].txid, 1);
      assert.strictEqual(result[0].kode, 2);
      assert.strictEqual(result[0].operation, 'insert');
      assert.strictEqual(result[0].navn, 'bar');
    }));

    it('Can compute updates by diffing two tables', () => go(function*() {
      const client = clientFn();
      yield client.query(`INSERT INTO ejerlav(kode, navn) values (1, 'foo')`);
      yield client.query(`INSERT INTO ejerlav(kode, navn) VALUES (2, 'bar')`);
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select * from ejerlav)`);
      yield client.query(`UPDATE fetch_ejerlav set navn = 'foobar' WHERE kode = 1`);
      const txid = 1;
      yield computeUpdates(client, txid, 'fetch_ejerlav', ejerlavTableModel);
      const result = yield client.queryRows('select * from ejerlav_changes');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].txid, 1);
      assert.strictEqual(result[0].kode, 1);
      assert.strictEqual(result[0].operation, 'update');
      assert.strictEqual(result[0].navn, 'foobar');
    }));

    it('Can compute deletes by diffing two tables', () => go(function*() {
      const client = clientFn();
      yield client.query(`INSERT INTO ejerlav(kode, navn) values (1, 'foo')`);
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select * from ejerlav)`);
      yield client.query(`INSERT INTO ejerlav(kode, navn) VALUES (2, 'bar')`);
      const txid = 1;
      yield computeDeletes(client, txid, 'fetch_ejerlav', ejerlavTableModel);
      const result = yield client.queryRows('select * from ejerlav_changes');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].txid, 1);
      assert.strictEqual(result[0].kode, 2);
      assert.strictEqual(result[0].operation, 'delete');
      assert.strictEqual(result[0].navn, 'bar');
    }));

    it('Can compute all differences by diffing two tables', () => go(function*() {
      const client = clientFn();
      // unmodified
      yield client.queryBatched(`INSERT INTO ejerlav(kode, navn) values (1, 'foo')`);
      // updated
      yield client.queryBatched(`INSERT INTO ejerlav(kode, navn) values (2, 'bar')`);
      yield client.queryBatched(`CREATE TEMP TABLE fetch_ejerlav AS (select * from ejerlav)`);

      yield client.queryBatched(`UPDATE fetch_ejerlav SET navn = 'baz' WHERE kode = 2`);
      // deleted
      yield client.queryBatched(`INSERT INTO ejerlav(kode, navn) values (3, 'foobar')`);
      // inserted
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) VALUES (4, 'foobaz')`);
      const txid = 1;
      yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
      const result = yield client.queryRows('select * from ejerlav_changes order by kode');
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].kode, 2);
      assert.strictEqual(result[0].navn, 'baz');
      assert.strictEqual(result[0].operation, 'update');
      assert.strictEqual(result[1].kode, 3);
      assert.strictEqual(result[1].operation, 'delete');
      assert.strictEqual(result[2].kode, 4);
      assert.strictEqual(result[2].navn, 'foobaz');
      assert.strictEqual(result[2].operation, 'insert');
    }));
  });
});
