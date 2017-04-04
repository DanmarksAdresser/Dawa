"use strict";

const Promise = require('bluebird');
const pg = require('pg');
const genericPool = require('generic-pool');
const pgConnectionString = require('pg-connection-string');
const TypeOverrides = require('pg/lib/type-overrides');
const setupDatabaseTypes = require('./setupDatabaseTypes');
const { withDawaClient } = require('./DawaClient');

const {go} = require('ts-csp');

const logger = require('../logger').forCategory('DatabasePool');

const DEFAULT_RAW_POOL_OPTIONS = {
  testOnBorrow: true,
  max: 50,
  min: 1,
  maxWaitingClients: 50,
  acquireTimeoutMillis: 10000,
  evictionRunIntervalMillis: 10000,
  idleTimeoutMillis: 3000,
  Promise,
  statementTimeout: 10000,
  autoStart: false
};

const withUnpooledRawConnection = (options, connectionFn) => go(function*() {
  const client = new pg.Client(options);
  yield Promise.promisify(client.connect, { context: client})();
  try {
    return yield this.delegateAbort(connectionFn(client));
  }
  finally {
    yield Promise.promisify(client.end, { context: client})();
  }
});

const rawConnectionPool = (options) => {
  options = Object.assign({}, DEFAULT_RAW_POOL_OPTIONS, options);
  const factory = {
    create: () => go(function*() {
      const client = new pg.Client(options);
      yield Promise.promisify(client.connect, { context: client})();
      yield client.query(`SET statement_timeout TO ${options.statementTimeout}`);
      return client;
    }),
    destroy: (client) => {
      return Promise.promisify(client.end, { context: client})();
    },
    validate: client => Promise.coroutine(function*(){
      try {
        yield client.query('select 1');
        return true;
      }
      catch(e) {
        return false;
      }

    })()
  };
  return genericPool.createPool(factory, options);
};

const withRawPooledConnection = (pool, connectionFn) => go(function*() {
  const client = yield pool.acquire();
  try {
    return yield this.delegateAbort(connectionFn(client));
  }
  finally {
    yield pool.release(client);
  }
});

const withUnpooledDawaClient = (options, clientFn) =>
  withUnpooledRawConnection(options, (rawClient) =>
    withDawaClient(rawClient, options, clientFn));

const withPooledDawaClient = (pool, options, clientFn) =>
  withRawPooledConnection(pool, (rawClient) =>
    withDawaClient(rawClient, options, clientFn));


const createDatabasePool = _options => {
  const connectionOptions = pgConnectionString.parse(_options.connString);
  const options =  Object.assign({}, _options, connectionOptions);
  const requestLimiter = options.requestLimiter || ((clientId, fn) => fn());
  let pool = null;
  const setupProcess =  go(function*() {
    /* eslint no-constant-condition: 0 */
    while (true) {
      try {
        yield withUnpooledDawaClient(options, client => go(function*() {
          // The OIDs for custom types are not fixed beforehand, so we query them from the database
          const result = yield client.query('select typname, oid from pg_type', []);
          const typeMap = result.rows.reduce((memo, row) => {
            memo[row.typname] = row.oid;
            return memo;
          }, {});
          const types = new TypeOverrides(pg.types);
          setupDatabaseTypes(types, typeMap);
          options.types = types;
          if (options.pooled !== false) {
            pool = rawConnectionPool(options);
            pool.on('factoryCreateError', function (err) {
              logger.error('GenericPool failed to create client', err);
            });

            pool.on('factoryDestroyError', function (err) {
              logger.error('GenericPool failed to destroy client', err);
            });
          }
        }));
        break;
      }
      catch (e) {
        logger.error('failed to initialize pool, retrying in 5s', e);
        yield Promise.delay(5000);
      }
    }
    if (options.pooled) {
      pool.start();
    }
  });

  const withConnection = (connectionOptions, fn) => {
    const combinedOptions = Object.assign({}, { requestLimiter: this.requestLimiter},
      options, connectionOptions);
    if(options.pooled === false || combinedOptions.pooled === false) {
      return withUnpooledDawaClient(combinedOptions, fn);
    }
    else {
      return go(function*() {
        yield setupProcess;
        return yield this.delegateAbort(withPooledDawaClient(pool, combinedOptions, fn));
      });
    }
  };

  const withTransaction = (connectionOptions, mode, fn) => {
    return withConnection(connectionOptions,
      client => client.withTransaction(mode, () => fn(client)));
  };

  const getPoolStatus = () => {
    const requestLimiterStatus = requestLimiter.status ? requestLimiter.status() : 'Request limiting disabled';
    const poolStatus = pool === null ? 'Pooling disabled' : {
        size: pool.size,
        available: pool.available,
        borrowed: pool.borrowed,
        pending: pool.pending,
        max: pool.max,
        min: pool.min
      };
    return {
      pool: poolStatus,
      requestLimiter: requestLimiterStatus
    };
  };
  return {
    withConnection,
    withTransaction,
    getPoolStatus,
    setupProcess
  }
};

module.exports = {
  createDatabasePool
};
