"use strict";

const _ = require('underscore');
const {assert} = require('chai');
const {go} = require('ts-csp');
const testdb = require('../helpers/testdb2');
const registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');
const request = require('request-promise');

const tableModel = require('../../psql/tableModel');

const {computeDifferences, applyChanges} = require('../../importUtil/tableDiffNg');
const {withImportTransaction} = require('../../importUtil/importUtil');
const helpers = require('./helpers');
const replikeringModel = require('../../apiSpecification/replikering/datamodel');

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
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn, ændret, geo_ændret, geo_version) values (1, 'foo', now(), now(), 1)`);
      yield client.queryBatched(`INSERT INTO fetch_ejerlav(kode, navn, ændret, geo_ændret, geo_version) values (2, 'foobar', now(), now(), 1)`);
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
      assert.strictEqual(result.length, 1);
      assert.deepEqual(_.pick(result[0], 'kode', 'navn'), {kode: 2, navn: 'foobar'});
    }));
    it('Giver korrekt udtræk hvis sekvensnummer angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavUdtraekResource, {}, {sekvensnummer: "3"});
      assert.deepEqual(result.map(row => _.pick(row, 'kode', 'navn')),
        [{kode: 1, navn: 'bar'},
          {kode: 2, navn: 'foobar'}]);
    }));
    it('Giver korrekte hændelser hvis sekvensnumre ikke angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavEventsResource, {}, {});
      assert.strictEqual(result.length, 4);
      assert.deepEqual(result.filter(event => event.data.kode === 2).map(event => _.pick(event.data, 'kode', 'navn')),
        [{kode: 2, navn: 'foobar'}]);
      assert.deepEqual(result.map(event => event.data).filter(data => data.kode === 1).map(data => data.navn),
        ["foo", "bar", "bar"]);
      assert.deepEqual(result.filter(event => event.data.kode === 1).map(event => event.operation),
        ['insert', 'update', 'delete']);
      assert.deepEqual(result.filter(event => event.data.kode === 2).map(event =>_.pick( event.data, 'kode', 'navn')),
        [{kode: 2, navn: 'foobar'}]);
    }));

    it('Giver korrekte hændelser hvis sekvensnumre angives', () => go(function*() {
      const result = yield helpers.getJson(clientFn(), ejerlavEventsResource, {}, {sekvensnummerfra: '3', sekvensnummertil: '4'});
      assert.strictEqual(result.length, 2);
      assert.deepEqual(result.map(event => event.sekvensnummer), [3, 4]);
    }));
  });
});

const attrVerifiers = {
  integer: (val) => Number.isInteger(val),
  real: (val) => typeof(val) === 'number',
  boolean: val => typeof(val) === 'boolean',
  string: val => typeof(val) === 'string',
  uuid: val => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(val),
  timestamp: val => typeof(val) === 'string',
  localdatetime: val => typeof(val) === 'string',
  point2d: val => typeof val === "object" && Array.isArray(val.coordinates) && val.type === 'Point'
    && val.coordinates.length === 2 && typeof(val.coordinates[0]) === 'number' && typeof(val.coordinates[1]) === 'number',
  geometry: val => typeof(val) === 'object'
};

const verifyAttr = (attr, val) => {
  if(val === null) {
    assert(attr.nullable, `Null-værdi i ikke-nullable attribut ${attr.name}`);
    return;
  }
  const verifier = attrVerifiers[attr.type];
  assert(verifier(val), `Value ${val} is of type ${attr.type}`);
};

const entitiesWithoutData = ['dar_reserveretvejnavn_historik', 'dar_reserveretvejnavn_aktuel'];
describe('Replikerede entiteter', () => {
  for(let entity of Object.keys(replikeringModel)) {
    it(`Kan hente udtræk for ${entity}`, () => go(function*() {
      const response = yield request.get({url:`http://localhost:3002/replikering/udtraek?entitet=${entity}`, json: true});
      if(!entitiesWithoutData.includes(entity)) {
        assert(response.length > 0);
        const model = replikeringModel[entity];
        for(let row of response) {
          for(let attr of model.attributes) {
            const val = row[attr.name];
            verifyAttr(attr, val);
          }
        }
      }
    }));
  }
});

describe('Transaktioner inspektion', () => {
    it('Kan inspicere en transaktion', () => go(function*() {
      const response = yield request.get({url:`http://localhost:3002/replikering/transaktioner/inspect?txid=4`, json: true});
      assert.notDeepEqual(response, {});
    }));
});

describe('Opslag på replikerings-API', () => {
  testdb.withTransactionEach('test', (clientFn) => {

  });
});