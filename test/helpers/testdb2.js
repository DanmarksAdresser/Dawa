"use strict";

const databasePools = require('../../psql/databasePools');
const defaultScriptLogger = require('../../psql/scriptDbLogger');

const  { go } = require('ts-csp');

const testConnString = process.env.pgConnectionUrl;
const emptyConnString = process.env.pgEmptyDbUrl;
const replikeringTestConnString = process.env.pgReplikeringDbUrl;
databasePools.create('test', {
  connString: testConnString,
  logger: defaultScriptLogger
});
databasePools.create('empty', {
  connString: emptyConnString,
  logger: defaultScriptLogger
});

databasePools.create('replikeringtest', {
  connString: replikeringTestConnString,
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

module.exports = {
  withTransaction,
  withTransactionX,
  withTransactionEach,
  withTransactionAll
};
