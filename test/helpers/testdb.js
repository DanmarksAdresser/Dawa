"use strict";

var setupDatabase = require('../../psql/setupDatabase');

var transactions = require('../../psql/transactions');

var testConnString = process.env.pgConnectionUrl;
var emptyConnString = process.env.pgEmptyDbUrl;

setupDatabase('test', testConnString);
setupDatabase('empty', emptyConnString);

exports.withTransaction = function(dbname, mode, transactionFn) {
  return transactions.withTransaction(dbname, { pooled: true, mode: mode}, transactionFn);
};

/**
 * Open a transaction in beforeEach,
 * rollback the transaction in afterEah,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
exports.withTransactionEach = function(dbname, transactionFn) {
  var tx;
  beforeEach(function() {
    return transactions.beginTransaction(dbname, {
      pooled: true,
      mode: 'ROLLBACK'
    }).then(function(_tx) {
      tx = _tx;
    });
  });
  afterEach(function() {
    return transactions.endTransaction(tx);
  });
  return transactionFn(function() {
    return tx.client;
  });
};

/**
 * Open a transaction in before,
 * rollback the transaction in after,
 * transactionFn receives a no-arg function as first argument,
 * which returns the db client
 * @param transactionFn
 */
exports.withTransactionAll = function(dbname, transactionFn) {
  var tx;
  before(function() {
    return transactions.beginTransaction(dbname, {
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