"use strict";

const databasePools = require('@dawadk/common/src/postgres/database-pools');
const scriptDbLogger = require('./scriptDbLogger');
let options;


exports.init = function(_options) {
  options = Object.assign({}, { logger: scriptDbLogger }, _options);
  databasePools.create('prod', options);
};

exports.withTransaction = function(arg1, arg2, arg3) {
  if(arguments.length == 2) {
    const [mode, transactionFn] = [arg1, arg2];
    return databasePools.get('prod').withTransaction(options, mode, transactionFn).asPromise();
  }
  else if (arguments.length === 3) {
    const [connectionOptions, mode, transactionFn] = [arg1, arg2, arg3];
    return databasePools.get('prod').withTransaction(Object.assign({}, options, connectionOptions), mode, transactionFn).asPromise();
  }
};
