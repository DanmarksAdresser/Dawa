"use strict";

const { createDatabasePool } = require('./DatabasePool');

const pools = {};
exports.create = (name, options) => {
  const pool = createDatabasePool(options);
  pools[name] = pool;
  return pool.setupProcess;
};

exports.get = name => {
  return pools[name];
};
