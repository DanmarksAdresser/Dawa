"use strict";

const { assert } = require('chai');
const { go } = require('ts-csp');
const testdb = require('@dawadk/test-util/src/testdb');

const { computeInserts, computeUpdates, computeDeletes, computeDifferences, applyChanges, makeSelectClause }  = require('../src/table-diff');
const { tsvColumn, geomColumns, visueltCenterDerived, ændretColumn} = require('../src/common-columns');
const { fromSource } = require('../src/table-diff-protocol');
const { withImportTransaction } = require('../src/transaction');

const ejerlavTableModel =  {
    entity: 'ejerlav',
    table: 'ejerlav',
    primaryKey: ['kode'],
    columns: [{
        name: 'kode'
    }, {
        name: 'navn'
    },
    tsvColumn({
      deriveFn:
      table => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
    }),
      ...geomColumns({offloaded: true})
      ,
      visueltCenterDerived({})]
};

describe('makeSelectClause', () => {
  it('fromSource default is true', () => {
    assert(fromSource({}));
  });
  it('Makes correct select clauses for derived column', () => {
    const tableModel = {
      columns: [
        tsvColumn({
          deriveFn:
            table => `to_tsvector('adresser', processForIndexing(coalesce(${table}.navn, '')))`
        })
      ]
    };
    const clause = makeSelectClause('tab', tableModel);
    assert.strictEqual(clause, `to_tsvector('adresser', processForIndexing(coalesce(tab.navn, ''))) as tsv`);
  });

  it('Makes correct select clauses for named columns', () => {
    const tableModel = {
      columns: [{
        name: 'kode'
      }, {
        name: 'navn'
      }]
    };
    const clause = makeSelectClause('tab', tableModel);
    assert.strictEqual(clause, 'tab.kode, tab.navn');
  });

  it('Does not create select clauses for columns not from source', () => {
    const tableModel = {
      columns: [
        ændretColumn()
      ]
    };
    const clause = makeSelectClause('tab', tableModel);
    assert.strictEqual(clause, '');
  });
});

describe('tableDiffNg', () => {
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can compute inserts by diffing two tables', () => go(function*() {
      const client = clientFn();
      yield client.query(`INSERT INTO ejerlav(kode, navn, ændret, geo_ændret, geo_version) values (1, 'foo', now(), now(), 1)`);
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select kode,navn,geom from ejerlav)`);
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
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select kode,navn,geom from ejerlav)`);

      yield client.query(`INSERT INTO fetch_ejerlav(kode, navn) values (1, 'foo')`);
      yield client.query(`INSERT INTO fetch_ejerlav(kode, navn) VALUES (2, 'bar')`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      yield client.query(`UPDATE fetch_ejerlav set navn = 'foobar' WHERE kode = 1`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeUpdates(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        const result = yield client.queryRows('select * from ejerlav_changes where txid = $1', [txid]);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].txid, 2);
        assert.strictEqual(result[0].kode, 1);
        assert.strictEqual(result[0].operation, 'update');
        assert.strictEqual(result[0].navn, 'foobar');
        assert.strictEqual(result[0].tsv, "'foobar':1");
      }));
    }));

    it('Can compute deletes by diffing two tables', () => go(function*() {
      const client = clientFn();
      yield client.query(`INSERT INTO ejerlav(kode, navn, ændret, geo_ændret, geo_version) values (1, 'foo', now(), now(), 1)`);
      yield client.query(`CREATE TEMP TABLE fetch_ejerlav AS (select kode,navn,geom from ejerlav)`);
      yield client.query(`INSERT INTO ejerlav(kode, navn, ændret, geo_ændret, geo_version) VALUES (2, 'bar', now(), now(), 1)`);
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
      yield client.queryBatched(`CREATE TEMP TABLE fetch_ejerlav AS (select kode, navn, geom from ejerlav)`);
      // unmodified
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (1, 'foo')`);
      // updated
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (2, 'bar')`);
      // deleted
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (3, 'foobar')`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));

      yield client.queryBatched(`DELETE FROM fetch_ejerlav WHERE kode = 3`);
      yield client.queryBatched(`UPDATE fetch_ejerlav SET navn = 'baz' WHERE kode = 2`);
      // inserted
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) VALUES (4, 'foobaz')`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        const result = yield client.queryRows(`select * from ejerlav_changes  where txid = ${txid} order by kode`);
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
    }));

    it('Will correctly generate changeids for multiple transactions', () => go(function*() {
      const client = clientFn();
      yield client.queryBatched(`CREATE TEMP TABLE fetch_ejerlav AS (select kode,navn,geom from ejerlav)`);
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (1, 'foo')`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      yield client.queryBatched(`UPDATE fetch_ejerlav SET navn='bar'`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      yield client.queryBatched(`DELETE FROM fetch_ejerlav`);
      yield withImportTransaction(client, 'test', [ejerlavTableModel], txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      const result = yield client.queryRows('select c.txid, c.changeid, c.operation from ejerlav_changes c JOIN transaction_history h ON c.changeid = h.sequence_number ORDER BY txid');
      assert.deepEqual(result, [
        {txid: 1, changeid: 1, operation: 'insert'},
        {txid: 2, changeid: 2, operation: 'update'},
        {txid: 3, changeid: 3, operation: 'delete'},
      ])
    }));
  });
});
