"use strict";

var setupDatabase = require('../../psql/setupDatabase');

var transactions = require('../../psql/transactions');

var testConnString = process.env.pgConnectionUrl;
var emptyConnString = process.env.pgEmptyDbUrl;

setupDatabase('test', {connString: testConnString});
setupDatabase('empty', {connString: emptyConnString});

exports.withTransaction = function(dbname, mode, transactionFn) {
  return transactions.withTransaction(dbname, { pooled: true, mode: mode}, transactionFn);
};

function withTransactionX(dbname, transactionFn, beforeFn, afterFn) {
  var tx;
  beforeFn(function() {
    return transactions.beginTransaction(dbname, {
      pooled: true,
      mode: 'ROLLBACK'
    }).then(function(_tx) {
      tx = _tx;
    });
  });
  transactionFn(function() {
    return tx.client;
  });
  afterFn(function() {
    return transactions.endTransaction(tx);
  });
}

exports.withTransactionX = withTransactionX;

/**
 * Open a transaction in beforeEach,
 * rollback the transaction in afterEah,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
exports.withTransactionEach = function(dbname, transactionFn) {
  return withTransactionX(dbname, transactionFn, beforeEach, afterEach);
};

/**
 * Open a transaction in before,
 * rollback the transaction in after,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
exports.withTransactionAll = function(dbname, transactionFn) {
  return withTransactionX(dbname, transactionFn, before, after);
};