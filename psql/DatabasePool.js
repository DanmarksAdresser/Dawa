"use strict";

const Promise = require('bluebird');
const pg = require('pg');
const pgConnectionString = require('pg-connection-string');
const TypeOverrides = require('pg/lib/type-overrides');
const setupDatabaseTypes = require('./setupDatabaseTypes');

const {go, Abort} = require('ts-csp');

const { processify } = require('../util/cspUtil');

const copyFrom = require('pg-copy-streams').from;

const logger = require('../logger').forCategory('DatabasePool');

const transactionStatements = {
  READ_ONLY: ['BEGIN READ ONLY', 'ROLLBACK'],
  READ_WRITE: ["BEGIN;SELECT pg_advisory_xact_lock(1);SET work_mem='256MB'", 'COMMIT'],
  ROLLBACK: ['BEGIN', 'ROLLBACK']
};


/* eslint no-console: 0 */
const withConnection = (connectFn, createProcessFn) => go(function*() {
  const {client, done} = yield connectFn();
  if (this.abortSignal.isRaised()) {
    done();
    throw new Abort(this.abortSignal.value());
  }
  try {
    yield this.delegateAbort(createProcessFn(client));
    done();
  }
  catch (err) {
    if (err instanceof Abort) {
      done();
    }
    else {
      // something unexpected happened, discard connection
      done(err);
    }
    throw err;
  }
});

class DawaClient {


  constructor(client, options) {
    this.client = client;
    options = options || {};
    this.clientId = options.clientId;
    this.requestLimiter = options.requestLimiter || ((clientId, fn) => fn());
    this.logger = options.logger || (() => null);
    this.released = false;
    this.batchedQueries = [];
    this.inTransaction = false;
    this.queryInProgress = false;
    this.allowParallelQueries = false;
  }

  queryRows(sql, params) {
    const thisClient = this;
    return go(function*() {
      const result = yield this.delegateAbort(thisClient.query(sql, params));
      return result.rows || [];
    });
  }

  queryBatched(sql) {
    this.batchedQueries.push(sql);
    return Promise.resolve();
  }

  flush() {
    const  { batchedQueries, client } = this;
    return go(function*() {
      if(batchedQueries.length > 0) {
        yield Promise.promisify(client.query, {context: client})(batchedQueries.join(';\n'));
        batchedQueries.length = 0;
      }
    });
  }

  query(sql, params) {
    if (this.released) {
      throw new Error('Attempted to query using released client!');
    }
    if (this.queryInProgress && !this.allowParallelQueries) {
      throw new Error('Query already in progress');
    }
    this.queryInProgress = true;
    const { clientId, requestLimiter, logger, client } = this;
    const thisClient = this;
    return go(function*() {
      yield thisClient.flush();
      const beforeTs = Date.now();
      const abortSignal = this.abortSignal;
      const fn = Promise.coroutine(function*() {
        const logMessage = {
          sql,
          params
        };

        try {
          const afterQueueTs = Date.now();
          const waitTime = afterQueueTs - beforeTs;
          logMessage.waitTime = waitTime;
          if (abortSignal.isRaised()) {
            throw new Abort(abortSignal.value());
          }
          let result;
          try {
            result = yield Promise.promisify(client.query, {context: client})(sql, params);
          }
          catch (err) {
            if (err) {
              logMessage.error = err;
            }
            throw err;
          }
          finally {
            const afterQueryTs = Date.now();
            logMessage.queryTime = afterQueryTs - afterQueueTs;
          }
          result.rows = result.rows || [];
          return result;
        }
        catch (err) {
          if (err instanceof Abort) {
            logMessage.aborted = true;
            logMessage.abortReason = err.reason;
          }
          throw err;
        }
        finally {
          thisClient.queryInProgress = false;
          logger(logMessage);
        }
      });

      if (requestLimiter && clientId) {
        return yield requestLimiter(clientId, fn);
      }
      else {
        return yield fn();
      }
    });

  }

  copyFrom(sql) {
    return this.client.query(copyFrom(sql));
  }

  withTransaction(mode, transactionFn) {
    if(this.inTransaction) {
      return transactionFn();
    }
    this.inTransaction = true;
    const client = this;
    return go(function*() {
      yield this.delegateAbort(client.query(transactionStatements[mode][0]));
      try {
        const result = yield this.delegateAbort(processify(transactionFn()));
        client.inTransaction = false;
        // note that we do *not* abort transaction commit/rollback
        yield client.query(transactionStatements[mode][1]);
        return result;
      }
      catch(err) {
        if(err instanceof Abort) {
          // regular abort, rollback transaction
          yield client.query('ROLLBACK');
        }
        throw err;
      }
    });

  }

  queryp(sql, params) {
    return this.query(sql, params).asPromise();
  }
}

const connectUnpooled = (options) => {
  const client = new pg.Client(options);
  return Promise.promisify(client.connect, {context: client})().then(() => {
    const dawaClient = new DawaClient(client);
    return {
      client: dawaClient,
      done: () => {
        dawaClient.released = true;
        client.end();
      }
    };
  });
};


class DatabasePool {
  constructor(options) {
    const connectionOptions = pgConnectionString.parse(options.connString);
    this.options = Object.assign({}, options, connectionOptions);
  }

  setup() {
    const options = this.options;
    const thisPool = this;
    this.requestLimiter = options.requestLimiter || ((clientId, fn) => fn());
    this.setupProcess =  go(function*() {
      yield withConnection(
        () => connectUnpooled(options),
        (client) => go(function*() {
          // The OIDs for custom types are not fixed beforehand, so we query them from the database
          const result = yield client.query('select typname, oid from pg_type', []);
          const typeMap = result.rows.reduce((memo, row) => {
            memo[row.typname] = row.oid;
            return memo;
          }, {});
          const types = new TypeOverrides(pg.types);
          setupDatabaseTypes(types, typeMap);
          options.types = types;
        }));
      thisPool.pool = new pg.Pool(options);
      thisPool.pool.on('error', (err) => {
        logger.error('Database Pool Error', err);
      });
    });
    return this.setupProcess;
  }

  withConnection(options, fn) {
    let connect;
    options = Object.assign({}, options, { requestLimiter: this.requestLimiter});
    if(options.pooled === false) {
      connect = () => connectUnpooled(Object.assign({}, this.options, options));
    }
    else {
      connect = Promise.promisify(callback => {
        this.pool.connect((err, client, done) => {
          if (err) {
            callback(err);
          }
          else {
            const dawaClient = new DawaClient(client, options);
            callback(null, {
              client: dawaClient,
              done: (err) => {
                client.released = true;
                done(err);
              }
            });
          }
        });
      });
    }
    const thisPool = this;
    return go(function*() {
      yield thisPool.setupProcess;
      yield this.delegateAbort(withConnection(connect, fn));
    });

  }

  withTransaction(connectionOptions, mode, fn) {
    return this.withConnection(connectionOptions, client => client.withTransaction(mode, () => fn(client)));
  }

  getPoolStatus() {
    const requestLimiterStatus = this.requestLimiter.status ? this.requestLimiter.status() : 'Request limiting disabled';
    return {
      size: this.pool.pool.getPoolSize(),
      availableObjectsCount: this.pool.pool.availableObjectsCount(),
      waitingClientsCount: this.pool.pool.waitingClientsCount(),
      requestLimiter: requestLimiterStatus
    };
  }

}

module.exports = {
  DatabasePool
};
