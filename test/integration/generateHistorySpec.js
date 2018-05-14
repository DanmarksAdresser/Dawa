"use strict";

var expect = require('chai').expect;
var q = require('q');

const {mergeValidTime, createHeadTailTempTable} = require('../../history/common');
const generateHistory = require('../../history/generateCombinedHistoryImpl');
var testdb = require('../helpers/testdb2');

q.longStackSupport = true;

describe('History generation', () => {
  describe('mergeValidTime', () => {
    testdb.withTransactionEach('empty', (clientFn) => {
      beforeEach(q.async(function*() {
        var client = clientFn();
        client.allowParallelQueries = true;
        yield client.queryp('CREATE TEMP TABLE foo(id1 integer, id2 integer, a text, b text, virkning tstzrange)');
        yield client.queryp("INSERT INTO foo(id1, id2, a, b, virkning) VALUES (1, 1, 'a1', 'b1', '[\"2000-01-01Z\", \"2001-01-01Z\")')");
        yield client.queryp("INSERT INTO foo(id1, id2, a, b, virkning) VALUES (1, 1, 'a1', 'b2', '[\"2001-01-01Z\", \"2002-01-01Z\")')");
        yield client.queryp("INSERT INTO foo(id1, id2, a, b, virkning) VALUES (1, 1, 'a2', 'b1', '[\"2002-01-01Z\", \"2003-01-01Z\")')");
        yield client.queryp("INSERT INTO foo(id1, id2, a, b, virkning) VALUES (1, 1, 'a1', 'b1', '[\"2003-01-01Z\", \"2004-01-01Z\")')");
      }));
      it('Heads and tails of intervals to be merged should be computed correctly', q.async(function*() {
        var client = clientFn();
        yield createHeadTailTempTable(client, 'foo', 'foo_hts', ['id1', 'id2'], ['id1', 'id2', 'a'], false);
        var result = (yield client.queryp('SELECT * FROM foo_hts order by lower(virkning)'));
        var rows = result.rows;
        expect(rows).to.have.length(4);
        expect(rows[0].head).to.be.true;
        expect(rows[0].tail).to.be.false;
        expect(rows[1].head).to.be.false;
        expect(rows[1].tail).to.be.true;
        expect(rows[2].head).to.be.true;
        expect(rows[2].tail).to.be.true;
        expect(rows[3].head).to.be.true;
        expect(rows[3].tail).to.be.true;
      }));
      it('Should correctly merge intervals', q.async(function*() {
        var client = clientFn();
        yield mergeValidTime(client, 'foo', 'foo_merged', ['id1', 'id2'], ['id1', 'id2', 'a'], false);
        var rows = (yield client.queryp('SELECT * from foo_merged ORDER BY lower(virkning)')).rows;
        expect(rows).to.have.length(3);
        expect(rows[0].virkning.lower).to.equal('2000-01-01T00:00:00.000Z');
        expect(rows[0].virkning.upper).to.equal('2002-01-01T00:00:00.000Z');
      }));
    });
  });

  describe('Generate history', () => {
    testdb.withTransactionEach('empty', (clientFn) => {
      it('Can generate a completely empty history', q.async(function*() {
        var client = clientFn();
        client.allowParallelQueries = true;
        yield generateHistory.generateHistory(client, '2018-04-05T00:00:00.000Z');
      }));
    });
  });
});
