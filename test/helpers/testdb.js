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
    pooled: false,
    mode: mode
  }, transactionFn);
};