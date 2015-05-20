"use strict";

var q = require('q');

var setupDatabase = require('./setupDatabase');

var transactions = require('./transactions');

var options;


exports.init = function(_options) {
  options = _options;
  setupDatabase('prod', options);
};

exports.withTransaction = function(mode, transactionFn) {
  return transactions.withTransaction('prod', {
    pooled: options.pooled,
    mode: mode
  }, transactionFn);
};
