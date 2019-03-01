const {go} = require('ts-csp');
const { Client } = require('pg');
const config = require('@dawadk/common/src/config/holder').getConfig();
const initialization = require('./initialization');
const {createDatabasePool} = require('@dawadk/common/src/postgres/database-pool');
const {initializeData} = require('./data-initialization');
const makeConnectionString = (user, password, host, port, database) => `postgres://${user ? user : ''}${password ? `:${password}` : ''}${user ? '@' : ''}${host}:${port}/${database}`;

module.exports = () => go(function* () {
  const user = config.get('test.database_user');
  const password = config.get('test.database_password');
  const host = config.get('test.database_host');
  const port = config.get('test.database_port');

  const client = new Client({
    user,
    password,
    port,
    host
  });
  yield client.connect();
  try {
    for (let db of [config.get('test.data_db'), config.get('test.empty_db'), config.get('test.schema_db')]) {
      yield client.query(`DROP DATABASE IF EXISTS ${db}; `);
      yield client.query(`CREATE DATABASE ${db} ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0`);
    }
  }
  finally {
    yield client.end();
  }
  for (let db of [config.get('test.data_db'), config.get('test.empty_db'), config.get('test.schema_db')]) {
    const pool = createDatabasePool({
      connString: makeConnectionString(user, password, host, port, db),
      pooled: false
    });
    yield pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
      yield client.query(`
      ALTER DATABASE ${db} SET cursor_tuple_fraction = 0.001;
ALTER DATABASE ${db} SET random_page_cost = 1.1;
ALTER DATABASE ${db} SET effective_cache_size='7GB';
ALTER DATABASE ${db} SET join_collapse_limit=20;
ALTER DATABASE ${db} SET from_collapse_limit=20;`);
      yield client.query(
        `CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    }));
  }
  for (let [db, loadData] of [[config.get('test.data_db'), true], [config.get('test.schema_db'), false]]) {
    const pool = createDatabasePool({
      connString: makeConnectionString(user, password, host, port, db),
      pooled: false
    });
    yield pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
      yield initialization.initializeSchema(client);
      if (loadData) {
        yield initializeData(client);
      }
    }));
  }
});