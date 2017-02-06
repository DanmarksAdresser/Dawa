"use strict";

const databasePools = require('./databasePools');
const scriptDbLogger = require('./scriptDbLogger');

let options;


exports.init = function(_options) {
  options = Object.assign({}, { logger: scriptDbLogger }, _options);
  databasePools.create('prod', options);
};

exports.withTransaction = function(mode, transactionFn) {
  return databasePools.get('prod').withTransaction(options, mode, transactionFn).asPromise();
};
