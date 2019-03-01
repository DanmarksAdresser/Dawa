"use strict";
const { assert } = require('chai');
const { createDatabasePool } = require('../../src/postgres/database-pool');
const makeConnectionString = require('../../src/postgres/make-connection-string');
const { go } = require('ts-csp');
const config = require('../../src/config/holder').getConfig();
describe('DatabasePool', () => {
  it('Can be initialized and queried', () => {

    return go(function*() {
      const user = config.get('test.database_user');
      const password = config.get('test.database_password');
      const host = config.get('test.database_host');
      const port = config.get('test.database_port');
      const db = config.get('test.data_db');
      const pool = createDatabasePool({
        connString: makeConnectionString(user, password, host, port, db)
      });
      yield pool.setupProcess;
      yield pool.withConnection({}, client => go(function*() {
        const result = yield client.query('SELECT 1 as n');
        assert.strictEqual(result.rows[0].n, 1);
      }));
    });
  });
});
