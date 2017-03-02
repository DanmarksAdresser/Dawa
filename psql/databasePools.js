"use strict";
const pg = require('pg');
require('pg-parse-float')(pg);
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
