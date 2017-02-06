"use strict";
const { assert } = require('chai');
const { DatabasePool } = require('../../psql/DatabasePool');
const { go } = require('ts-csp');
describe('DatabasePool', () => {
  it('Can be initialized and queried', () => {
    return go(function*() {
      const pool = new DatabasePool({
        connString: process.env.pgConnectionUrl
      });
      yield pool.setup();
      yield pool.withConnection({}, client => go(function*() {
        const result = yield client.query('SELECT 1 as n');
        assert.strictEqual(result.rows[0].n, 1);
      }));
    }).asPromise();
  });
});
