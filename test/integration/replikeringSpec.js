"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');
const testdb = require('../helpers/testdb2');
const registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

const tableModel = require('../../psql/tableModel');

const {computeDifferences, applyChanges} = require('../../importUtil/tableDiffNg');
const {withImportTransaction} = require('../../importUtil/importUtil');
const helpers = require('./helpers');

const ejerlavTableModel = tableModel.tables.ejerlav;
const ejerlavUdtraekResource = registry.findWhere({
  entityName: 'ejerlav',
  type: 'resource',
  qualifier: 'udtraek'
});

const ejerlavEventsResource = registry.findWhere({
  entityName: 'ejerlav',
  type: 'resource',
  qualifier: 'hændelser'
});
describe('Replikering', () => {
  testdb.withTransactionEach('empty', (clientFn) => {
    beforeEach(() => go(function*() {
      const client = clientFn();
      yield client.queryBatched(`CREATE TEMP TABLE fetch_ejerlav AS (select * from ejerlav)`);
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (1, 'foo')`);
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn) values (2, 'foobar')`);
      yield withImportTransaction(client, 'test', txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      yield client.queryBatched(`UPDATE fetch_ejerlav SET navn='bar' WHERE kode = 1`);
      yield withImportTransaction(client, 'test', txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
      yield client.queryBatched(`DELETE FROM fetch_ejerlav WHERE kode = 1`);
      yield withImportTransaction(client, 'test', txid => go(function*() {
        yield computeDifferences(client, txid, 'fetch_ejerlav', ejerlavTableModel);
        yield applyChanges(client, txid, ejerlavTableModel);
      }));
    }));
    it('Giver korrekt udtræk hvis sekvensnummer ikke angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavUdtraekResource, {}, {});
      assert.deepEqual(result, [{kode: 2, navn: 'foobar'}]);
    }));
    it('Giver korrekt udtræk hvis sekvensnummer angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavUdtraekResource, {}, {sekvensnummer: "3"});
      assert.deepEqual(result,
        [{kode: 1, navn: 'bar'},
          {kode: 2, navn: 'foobar'}]);
    }));
    it('Giver korrekte hændelser hvis sekvensnumre ikke angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavEventsResource, {}, {});
      assert.strictEqual(result.length, 4);
      assert.deepEqual(result.filter(event => event.data.kode === 2).map(event => event.data),
        [{kode: 2, navn: 'foobar'}]);
      assert.deepEqual(result.map(event => event.data).filter(data => data.kode === 1).map(data => data.navn),
        ["foo", "bar", "bar"]);
      assert.deepEqual(result.filter(event => event.data.kode === 1).map(event => event.operation),
        ['insert', 'update', 'delete']);
      assert.deepEqual(result.filter(event => event.data.kode === 2).map(event => event.data),
        [{kode: 2, navn: 'foobar'}]);
    }));

    it('Giver korrekte hændelser hvis sekvensnumre angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavEventsResource, {}, {sekvensnummerfra: '3', sekvensnummertil: '4'});
      assert.strictEqual(result.length, 2);
      assert.deepEqual(result.map(event => event.sekvensnummer), [3, 4]);
    }));
  });
});
