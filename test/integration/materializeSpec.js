"use strict";

const {assert} = require('chai');
const fs = require('fs');
const path = require('path');

const testdb = require('../helpers/testdb2');

const {
  computeDirty,
  createChangeTable,
  computeInserts,
  computeDeletes,
  computeUpdates
} = require('../../importUtil/materialize');

const {
  applyInserts,
  applyDeletes,
  applyUpdates
} = require('../../importUtil/tableDiffNg');

const {insert, update, del} = require('../../importUtil/tableModelUtil');
const {go} = require('ts-csp');

const tableModel = {
  prim: {
    table: 'prim',
    primaryKey: ['id'],
    columns: [{
      name: 'id'
    }, {
      name: 'name'
    }, {
      name: 'sec_id1'
    }, {
      name: 'sec_id2'
    }, {
      name: 'tert_id_part1'
    }, {
      name: 'tert_id_part2'
    }]
  },
  secondary: {
    table: 'secondary',
    primaryKey: ['id'],
    columns: [{
      name: 'id'
    }, {
      name: 'name'
    }]
  },
  tertiary: {
    table: 'tertiary',
    primaryKey: ['id_part1', 'id_part2'],
    columns: [{
      name: 'id_part1'
    }, {
      name: 'id_part2'
    }, {
      name: 'name'
    }]
  },
  primary_mat: {
    table: 'primary_mat',
    primaryKey: ['id'],
    columns: [{
      name: 'id'
    }, {
      name: 'prim_name'
    }, {
      name: 'sec_id1'
    }, {
      name: 'sec_id2'
    }, {
      name: 'sec_name1',
    }, {
      name: 'sec_name2'
    }, {
      name: 'tert_id_part1'
    }, {
      name: 'tert_id_part2'
    }, {
      name: 'tert_name'
    }, {
      name: 'derived'
    }]
  }
};

const testMaterialization = {
  table: 'primary_mat',
  view: 'primary_mat_view',
  primaryKey: ['id'],
  dependents: [{
    table: 'prim',
    columns: ['id']
  }, {
    table: 'secondary',
    columns: ['sec_id1']
  }, {
    table: 'secondary',
    columns: ['sec_id2']
  }]
};



describe('View materialization', () => {
  const setupSql = fs.readFileSync(path.join(__dirname, 'testMaterializeTables.sql'), {encoding: 'utf8'});
  testdb.withTransactionEach('empty', clientFn => {
    beforeEach(() => go(function*() {
      yield clientFn().query(setupSql);
      for (let table of Object.keys(tableModel)) {
        yield createChangeTable(clientFn(), table);
      }
    }));

    describe('crud', () => {
      it('Can insert a row', () => go(function*() {
        const object = {
          id: '00000000-0000-0000-0000-a7d428a980cf',
          name: 'foo'
        };
        yield insert(clientFn(), tableModel.prim, object);
        const result = yield clientFn().queryRows('select * from prim');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, object.id);
        assert.strictEqual(result[0].name, object.name);
      }));

      it('Can update a row', () => go(function*() {
        const object = {
          id: '00000000-0000-0000-0000-a7d428a980cf',
          name: 'foo'
        };
        const updated = {
          id: '00000000-0000-0000-0000-a7d428a980cf',
          name: 'bar'
        };
        yield insert(clientFn(), tableModel.prim, object);
        yield update(clientFn(), tableModel.prim, updated);
        const result = yield clientFn().queryRows('select * from prim');
        assert.strictEqual(result[0].id, object.id);
        assert.strictEqual(result[0].name, updated.name);
      }));

      it('Can delete a row', () => go(function*() {
        const o1 = {
          id: '00000000-0000-0000-0000-a7d428a980cf',
          name: 'foo'
        };
        const o2 = {
          id: '00000000-0000-0000-0001-a7d428a980cf',
          name: 'bar'
        };
        yield insert(clientFn(), tableModel.prim, o1);
        yield insert(clientFn(), tableModel.prim, o2);
        yield del(clientFn(), tableModel.prim, {id: o2.id});
        const result = yield clientFn().queryRows('select * from prim');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].id, o1.id);
      }));
    });
    describe('computeDirty', () => {
      it('If materialized table contains a row, and no dependent rows are changed, the row is not marked dirty', () => go(function*() {
        const client = clientFn();
        yield client.query(`INSERT INTO primary_mat(id, sec_id1) VALUES ('00002732-733c-433a-a5da-a7d428a980cf', 10)`);
        yield computeDirty(client, 1, tableModel, testMaterialization);
        const result = yield client.queryRows('select id from primary_mat_dirty');
        assert.deepEqual(result, []);
      }));
      it('If materialized table contains a row, and a dependent row is changed, the row is marked dirty', () => go(function*() {
        const client = clientFn();
        yield client.query(`INSERT INTO primary_mat(id, sec_id1) VALUES ('00002732-733c-433a-a5da-a7d428a980cf', 10)`);
        yield client.query(`INSERT INTO secondary_changes(txid, operation, public, id) values(1, 'delete', true, 10)`);
        yield computeDirty(client, 1, tableModel, testMaterialization);
        const result = yield client.queryRows('select id from primary_mat_dirty');
        assert.deepEqual(result, [{id: '00002732-733c-433a-a5da-a7d428a980cf'}]);
      }));
    });
    describe('applying changes', () => {
      const txid = 1;
      const insertedId = '00000000-733c-433a-a5da-a7d428a980cf';
      const deletedId = '00000000-0000-433a-a5da-a7d428a980cf';
      const updatedId = '10000000-0000-0000-a5da-a7d428a980cf';
      beforeEach(() => go(function*() {
        const client = clientFn();
        yield client.query(`INSERT INTO prim(id, sec_id1) VALUES ('00002732-733c-433a-a5da-a7d428a980cf', 9)`);
        yield client.query(`INSERT INTO prim(id, sec_id1, name) VALUES ('${updatedId}', 8, 'name')`);
        yield client.query(`INSERT INTO prim_changes(txid, operation, public, id, sec_id1) VALUES (${txid}, 'insert', true, '${insertedId}', 10)`);
        yield client.query(`INSERT INTO prim_changes(txid, operation, public, id, sec_id1) VALUES (${txid}, 'delete', true, '${deletedId}', 11)`);
        yield client.query(`INSERT INTO prim_changes(txid, operation, public, id, sec_id1, name) VALUES (${txid}, 'update', true, '${updatedId}', 12, null)`);
      }));
      it('Correctly applies insert', () => go(function*() {
        yield applyInserts(clientFn(), txid, tableModel.prim);
        const result = yield clientFn().queryRows('select id, sec_id1 from prim order by id');
        assert.strictEqual(result.length, 3);
        const insertedRow = result[0];
        assert.strictEqual(insertedRow.id, insertedId);
        assert.strictEqual(insertedRow.sec_id1, 10);
      }));

      it('Correctly applies delete', () => go(function*() {
        yield applyDeletes(clientFn(), txid, tableModel.prim);
        const result = yield clientFn().queryRows('select id, sec_id1 from prim order by id');
        assert.strictEqual(result.length, 1);
        assert.notEqual(result[0].id, deletedId);
      }));

      it('Correctly applies update', () => go(function*() {
        yield applyUpdates(clientFn(), txid, tableModel.prim);
        const result = yield clientFn().queryRows('select id, sec_id1,name from prim order by id');
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].sec_id1, 9);
        assert.strictEqual(result[1].sec_id1, 12);
        assert.isNull(result[1].name, 12);
      }));
    });
    describe('Computing changes', () => {
      const txid = 2;
      const unchangedId = '00000000-0000-0000-0000-a7d428a980cf';
      const insertedId = '00000000-733c-433a-a5da-a7d428a980cf';
      const deletedId = '00000000-0000-433a-a5da-a7d428a980cf';
      const updatedId = '10000000-0000-0000-a5da-a7d428a980cf';
      const tert_ref_cols = {
        tert_id_part1: 1, tert_id_part2: 2
      };
      beforeEach(() => go(function*() {
        const client = clientFn();
        yield insert(client, tableModel.tertiary, {id_part1: 1, id_part2: 2, name: 'tert_name'});
        yield insert(client, tableModel.prim, Object.assign({id: unchangedId}, tert_ref_cols));
        yield insert(client, tableModel.prim, Object.assign({id: deletedId}, tert_ref_cols));
        yield insert(client, tableModel.prim, Object.assign({id: updatedId}, tert_ref_cols));
        yield client.query('INSERT INTO primary_mat (select * from primary_mat_view)');
      }));

      it('Will compute an insert', () => go(function*() {
        const client = clientFn();
        yield client.query(
          `INSERT INTO prim_changes(txid, operation, public, id, tert_id_part1, tert_id_part2) 
           VALUES(${txid}, 'insert', true, '${insertedId}', 1, 2)`);
        yield applyInserts(client, txid, tableModel.prim);
        yield computeDirty(client, txid, tableModel, testMaterialization);
        yield computeInserts(client, txid, tableModel, testMaterialization);
        const result = yield client.queryRows('select * from primary_mat_changes');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].txid, txid);
        assert.strictEqual(result[0].operation, 'insert');
        assert.strictEqual(result[0].id, insertedId);
      }));

      it('Will compute a delete', () => go(function*() {
        const client = clientFn();
        yield client.query(
          `INSERT INTO prim_changes(txid, operation, public, id, tert_id_part1, tert_id_part2) 
           VALUES(${txid}, 'delete', true, '${deletedId}', 1, 2)`);
        yield applyDeletes(client, txid, tableModel.prim);
        yield computeDirty(client, txid, tableModel, testMaterialization);
        yield computeDeletes(client, txid, tableModel, testMaterialization);
        const result = yield client.queryRows('select * from primary_mat_changes');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].txid, txid);
        assert.strictEqual(result[0].operation, 'delete');
        assert.strictEqual(result[0].id, deletedId);
      }));

      it('Will compute an update', () => go(function*() {
        const client = clientFn();
        yield client.query(
          `INSERT INTO prim_changes(txid, operation, public, id, tert_id_part1, tert_id_part2, name) 
           VALUES(${txid}, 'update', true, '${updatedId}', 1, 2, 'foo')`);
        yield applyUpdates(client, txid, tableModel.prim);
        yield computeDirty(client, txid, tableModel, testMaterialization);
        yield computeUpdates(client, txid, tableModel, testMaterialization);
        const result = yield client.queryRows('select * from primary_mat_changes');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].txid, txid);
        assert.strictEqual(result[0].operation, 'update');
        assert.strictEqual(result[0].id, updatedId);
        assert.strictEqual(result[0].prim_name, 'foo');
      }));
    });
  });
});
