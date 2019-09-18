"use strict";

const config = require('@dawadk/common/src/config/holder').getConfig();
const databasePools = require('@dawadk/common/src/postgres/database-pools');

const  { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('sql');
const makeConnectionString = require('@dawadk/common/src/postgres/make-connection-string');

const defaultScriptLogger = logMessage => {
    if(logMessage.error) {
        logger.error('SQL query error', logMessage);
    }
};
const user = config.get('test.database_user');
const password = config.get('test.database_password');
const host = config.get('test.database_host');
const port = config.get('test.database_port');

const makeTestConnectionString = db => makeConnectionString(user, password, host, port, db);

databasePools.create('test', {
  connString: makeTestConnectionString(config.get('test.data_db')),
  logger: defaultScriptLogger
});
databasePools.create('empty', {
  connString: makeTestConnectionString(config.get('test.schema_db')),
  logger: defaultScriptLogger
});

databasePools.create('replikeringtest', {
  connString: makeTestConnectionString(config.get('test.empty_db')),
  logger: defaultScriptLogger
});

const makePromise = () => {
  let resolve = null, reject = null;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {resolve, reject,  promise};
};

const withTransaction =
  (dbname, mode, transactionFn) =>
    databasePools.get(dbname).withConnection(
      {
        statementTimeout: 30000
      },
      client => client.withTransaction(mode, () => transactionFn(client)));


function withTransactionX(dbname, transactionFn, beforeFn, afterFn) {
  let txReadyDeferred;
  let txCompletedDeferred;
  let transactionProcess, client = null;
  beforeFn(function() {
    if(client !== null) {
      throw new Error('Before ran before previous after finished');
    }
    txReadyDeferred = makePromise();
    txCompletedDeferred = makePromise();
    transactionProcess = withTransaction(dbname, 'ROLLBACK', (_client) => {
      return go(function*() {
        client = _client;
        txReadyDeferred.resolve(null);
        yield txCompletedDeferred.promise;
      });
    });
    return txReadyDeferred.promise;
  });
  transactionFn(() => {
    return client;
  });
  afterFn(function() {
    return go(function*() {
      client = null;
      txCompletedDeferred.resolve(null);
      yield transactionProcess;
    }).asPromise();
  });
}

/**
 * Open a transaction in beforeEach,
 * rollback the transaction in afterEah,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
const withTransactionEach = function(dbname, transactionFn) {
  return withTransactionX(dbname, transactionFn, beforeEach, afterEach);
};

/**
 * Open a transaction in before,
 * rollback the transaction in after,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
const withTransactionAll = function(dbname, transactionFn) {
  return withTransactionX(dbname, transactionFn, before, after);
};

/**
 * Simulate multi-transaction tests and make them run in a single tx.
 * @param dbname
 * @param dbFn
 */
function withPoolAll(dbname, dbFn) {
  withTransactionAll(dbname, clientFn => {
    const pool = {
      withTransaction: (connectionOptions, mode, transactionFn) =>
        transactionFn(clientFn())
    };
    dbFn(pool);
  });
}



module.exports = {
  withTransaction,
  withTransactionX,
  withTransactionEach,
  withTransactionAll,
  withPoolAll
};
