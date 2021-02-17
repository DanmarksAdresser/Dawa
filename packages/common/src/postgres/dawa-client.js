const Promise = require('bluebird');
const copyFrom = require('pg-copy-streams').from;
const { go, Abort } = require('ts-csp');
const { processify } = require('../csp-util');
const configHolder = require('@dawadk/common/src/config/holder');
const sqlLogger = require('@dawadk/common/src/logger').forCategory('Database');

const transactionStatements = {
  READ_ONLY: ['BEGIN READ ONLY', 'ROLLBACK'],
  READ_WRITE: ["BEGIN;SELECT pg_advisory_xact_lock(1);SET work_mem='256MB'", 'COMMIT'],
  READ_WRITE_CONCURRENT: ["BEGIN;SET work_mem='256MB'", 'COMMIT'],
  ROLLBACK: ['BEGIN', 'ROLLBACK']
};

class DawaClient {

  constructor(client, options) {
    this.client = client;
    options = options || {};
    this.clientId = options.clientId;
    this.requestLimiter = options.databaseQueryLimiter || ((clientId, fn) => fn());
    this.logger = options.logger || (() => null);
    this.released = false;
    this.batchedQueries = [];
    this.inTransaction = false;
    this.queryInProgress = false;
    this.allowParallelQueries = false;
    this.inReservedSlot = false;
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

  queryWithTiming(sql, params, options) {
    // console.log(sql);
    // console.log(JSON.stringify(params))
    options = options || {};
    const skipQueue = options.skipQueue || false;
    if (this.released) {
      throw new Error('Attempted to query using released client!');
    }
    if (this.queryInProgress && !this.allowParallelQueries) {
      throw new Error('Query already in progress');
    }
    const { logger, client } = this;
    const thisClient = this;
    return go(function*() {

      yield thisClient.flush();
      const beforeTs = Date.now();
      const abortSignal = this.abortSignal;
      const task = () => go(function*() {
        this.queryInProgress = true;
        const logMessage = {
          sql,
          params
        };

        try {
          const afterQueueTs = Date.now();
          const waitTime = afterQueueTs - beforeTs;
          logMessage.waitTime = waitTime;
          logMessage.queryTime = 0;
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
          logMessage.rows = result.rows.length;
          return [result, logMessage.queryTime];
        }
        catch (err) {
          if (err instanceof Abort) {
            logMessage.aborted = true;
            logMessage.abortReason = err.reason;
          }
          else {
            logMessage.error = err;
          }
          throw err;
        }
        finally {
          thisClient.queryInProgress = false;

          // log statistics for client
          logger(logMessage);

          // log SQL, if slow or error
          const error = logMessage.error;
          const config = configHolder.getConfig();
          const totalTime = logMessage.queryTime || 0;

          const shouldLog = config && (!options.skipSqlLogging && (error || (config.get('logging.log_sql') && totalTime > config.get('logging.log_sql_threshold'))));
          if(shouldLog) {
            const level = error ? 'error' : 'info';
            sqlLogger.log(level, 'sql', {
              cursor: false,
              sql,
              params,
              rows: logMessage.rows,
              queryTime: totalTime,
              error,
            });
          }
        }
      });

      if (skipQueue) {
        return yield task();
      }
      else {
        return yield thisClient.withReservedSlot(task);
      }
    });

  }

  query(sql, params, options) {
    const thisClient = this;
    return go(function*() {
      const [result] = yield this.delegateAbort(thisClient.queryWithTiming(sql, params, options));
      return result;
    });
  }

  withReservedSlot(fn, timeout) {
    const { clientId, requestLimiter } = this;
    if(this.inReservedSlot) {
      return fn();
    }
    if(!requestLimiter || !clientId) {
      return fn();
    }
    const that = this;
    return go(function*() {
      that.inReservedSlot = true;
      const before = Date.now();
      let waitTimeLogged = false;
      try {
        return yield this.delegateAbort(requestLimiter(clientId, () => {
          const waitTime = Date.now() - before;
          waitTimeLogged = true;
          that.logger({
            queryTime: 0,
            waitTime
          });
          return fn();
        }, timeout));
      }
      finally {
        that.inReservedSlot = false;
        if(!waitTimeLogged) {
          const waitTime = Date.now() - before;
          that.logger({
            queryTime: 0,
            waitTime
          });
        }
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
      yield this.delegateAbort(client.query(transactionStatements[mode][0], [], { skipQueue: true, skipSqlLogging: true }));
      try {
        const result = yield this.delegateAbort(processify(transactionFn()));
        // note that we do *not* abort transaction commit/rollback
        yield client.query(transactionStatements[mode][1], [], { skipQueue: true, skipSqlLogging: true });
        return result;
      }
      catch(e) {
        try {
          yield Promise.promisify(client.client.query, {context: client.client})('ROLLBACK');
        }
        catch(e) {
          // ignore
        }
        throw e;
      }
      finally {
        client.inTransaction = false;
      }
    });

  }

  queryp(sql, params) {
    return this.query(sql, params).asPromise();
  }
}

const withDawaClient = (rawClient, options, clientFn) => go(function*() {
  const dawaClient = new DawaClient(rawClient, options);
  try {
    return yield this.delegateAbort(processify(clientFn(dawaClient)));
  }
  finally {
    dawaClient.released = true;
  }
});

module.exports = { withDawaClient };
