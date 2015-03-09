"use strict";

require('../../setupDbConnection');

var transactions = require('../../psql/transactions');

var testConnString = process.env.pgConnectionUrl;
var emptyConnString = process.env.pgEmptyDbUrl;

exports.withTestDbTransaction = function(mode, transactionFn) {
  return transactions.withTransaction({
    connString: testConnString,
    pooled: true,
    mode: mode
  }, transactionFn);
};

exports.withEmptyDbTransaction = function(mode, transactionFn) {
  return transactions.withTransaction({
    connString: emptyConnString,
    pooled: true,
    mode: mode
  }, transactionFn);
};

/**
 * Open a transaction in before,
 * rollback the transaction in after,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db connection
 * @param transactionFn
 */
exports.withEmptyDbTransactionAll = function(transactionFn) {
  var tx;
  before(function() {
    return transactions.beginTransaction({
        connString: emptyConnString,
        pooled: true,
        mode: 'ROLLBACK'
      }).then(function(_tx) {
      tx = _tx;
    });
  });
  after(function() {
    return transactions.endTransaction(tx);
  });
  return transactionFn(function() {
    return tx.client;
  });
};