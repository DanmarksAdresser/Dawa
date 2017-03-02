const Promise = require('bluebird');
const copyFrom = require('pg-copy-streams').from;
const { go, Abort } = require('ts-csp');
const { processify } = require('../util/cspUtil');

const transactionStatements = {
  READ_ONLY: ['BEGIN READ ONLY', 'ROLLBACK'],
  READ_WRITE: ["BEGIN;SELECT pg_advisory_xact_lock(1);SET work_mem='256MB'", 'COMMIT'],
  ROLLBACK: ['BEGIN', 'ROLLBACK']
};

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
