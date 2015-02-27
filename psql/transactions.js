"use strict";

var pg = require('pg.js');
var _ = require('underscore');
var statistics = require('../statistics');
var Q = require('q');

require('../setupDbConnection');

function denodeifyClient(client) {
  var result = {};
  result.query = function() {
    return client.query.apply(client, arguments);
  };
  result.queryp = function(query, params) {
    return Q.ninvoke(client, 'query', query, params);
  };
  result.emit = function(type, event) {
    client.emit(type, event);
    return this;
  };
  result.on = function(type, handler) {
    client.on(type, handler);
    return this;
  };
  return result;
}

function acquireNonpooledConnection(connString, callback) {
  var client = new pg.Client(connString);
  client.connect(function (err) {
    if (err) return callback(err);
    callback(undefined, client, function () {
      client.end();
    });
  })
}

function acquirePooledConnection(connString, callback) {
  var before = Date.now();
  pg.connect(connString, function (err, client, releaseConnectionCb) {
    function done(err) {
      if (err) {
        client.end();
      }
      releaseConnectionCb();
    }

    statistics.emit('psql_acquire_connection', Date.now() - before, err);
    callback(err, client, done);
  });
}


function withConnection(connString, pooled, connectedFn) {
  var acquireFn = pooled ? acquirePooledConnection : acquireNonpooledConnection;
  return Q.Promise(function (resolve, reject) {
    acquireFn(connString, function (err, client, done) {
      if (err) {
        return reject(err);
      }
      return connectedFn(denodeifyClient(client)).then(
        function () {
          done();
        }, function (err) {
          done(err);
          return Q.reject(err);
        }
      ).then(resolve, reject);
    });
  });
}

function wrapWithStatements(client, beforeStmt, afterStmt, transactionFn) {
  return Q.ninvoke(client, 'query', beforeStmt, [])
    .then(function () {
      return transactionFn(client);
    })
    .then(function () {
      return Q.ninvoke(client, 'query', afterStmt, []);
    });
}

function defaultOptions(options) {
  if (!options.connString) {
    return Q.reject(new Error("No connection string supplied"));
  }
  _.defaults(options, {
    pooled: true,
    mode: 'READ_ONLY' // READ_WRITE, ROLLBACK
  });
  return options;
}

var transactionStatements = {
  READ_ONLY: ['BEGIN READ ONLY', 'ROLLBACK'],
  READ_WRITE: ['BEGIN;SELECT pg_advisory_xact_lock(1);', 'COMMIT'],
  ROLLBACK: ['BEGIN', 'ROLLBACK']
};

exports.withTransaction = function (options, transactionFn) {
  options = defaultOptions(options);
  return withConnection(options.connString, options.pooled, function (client) {
    return wrapWithStatements(client,
      transactionStatements[options.mode][0],
      transactionStatements[options.mode][1],
      transactionFn);
  });
};

exports.beginTransaction = function (options) {
  options = defaultOptions(options);
  var acquireFn = options.pooled ? acquirePooledConnection : acquireNonpooledConnection;
  return Q.Promise(function (resolve, reject) {
    acquireFn(options.connString, function (err, client, done) {
      if (err) {
        reject(err);
      }
      else {
        resolve({
          client: client,
          done: done,
          options: options
        });
      }
    });
  }).then(function (tx) {
    return Q.ninvoke(tx.client, 'query', transactionStatements[options.mode][0], []).catch(function (err) {
      tx.done(err);
      return Q.reject(err);
    });
  });
};

exports.endTransaction = function (tx, err) {
  if (err) {
    tx.done(err);
    return Q.reject(err);
  }
  else {
    return Q.ninvoke(tx.client, 'query', transactionStatements[tx.options.mode][1]).catch(function (err) {
      tx.done(err);
      return Q.reject(err);
    }).then(function () {
      tx.done(err);
    });
  }
};