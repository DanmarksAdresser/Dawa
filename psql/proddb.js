"use strict";

require('../setupDbConnection');

var transactions = require('./transactions');

var options;

exports.init = function(_options) {
  options = _options;
};

exports.withTransaction = function(mode, transactionFn) {
  return transactions.withTransaction({
    connString: options.connString,
    pooled: options.pooled,
    mode: mode
  }, transactionFn);
}