"use strict";

const { DatabasePool } = require('./DatabasePool');

const pools = {};
exports.create = (name, options) => {
  const pool = new DatabasePool(options);
  pools[name] = pool;
  return pool.setup();
};

exports.get = name => {
  return pools[name];
};
