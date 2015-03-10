"use strict";

var database = require('./database');
var setupDatabase = require('./setupDatabase');

var transactions = require('./transactions');

var options;

exports.init = function(_options) {
  options = _options;
  setupDatabase('prod', options.connString);
};

exports.withTransaction = function(mode, transactionFn) {
  return transactions.withTransaction('prod', {
    pooled: options.pooled,
    mode: mode
  }, transactionFn);
};
