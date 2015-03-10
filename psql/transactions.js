"use strict";

var _ = require('underscore');
var Q = require('q');

var database = require('./database');

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
  _.defaults(options, {
    pooled: true,
    mode: 'READ_ONLY', // READ_WRITE, ROLLBACK
    shouldAbort: function() { return false; }
  });
  return options;
}

var transactionStatements = {
  READ_ONLY: ['BEGIN READ ONLY', 'ROLLBACK'],
  READ_WRITE: ['BEGIN;SELECT pg_advisory_xact_lock(1);', 'COMMIT'],
  ROLLBACK: ['BEGIN', 'ROLLBACK']
};

exports.withTransaction = function (dbname, options, transactionFn) {
  options = defaultOptions(options);
  return database.withConnection(dbname, options.pooled, function (client) {
    return wrapWithStatements(client,
      transactionStatements[options.mode][0],
      transactionStatements[options.mode][1],
      function(client) {
        return transactionFn(client).then(function() {
          client.emit('transactionEnd');
        }, function(err) {
          client.emit('transactionEnd', err);
        });
      });
  });
};

exports.beginTransaction = function (dbname, options) {
  options = defaultOptions(options);
  var shouldAbort = options.shouldAbort;
  return Q.Promise(function (resolve, reject) {
    database.connect(dbname, options.pooled, function(err, client, done) {
      if (err) {
        return reject(err);
      }
      if (shouldAbort()) {
        done();
        return Q.reject(new Error('The transaction request was cancelled'));
      }
      resolve({
        client: client,
        done: done,
        options: options
      });
    });
  }).then(function (tx) {
    return tx.client.queryp(transactionStatements[options.mode][0], [])
      .catch(function (err) {
        tx.done(err);
        return Q.reject(err);
      }).then(function () {
        return tx;
      });
  });
};

exports.endTransaction = function (tx, err) {
  tx.client.emit('transactionEnd', err);
  if (err) {
    tx.done(err);
    return Q.reject(err);
  }
  else {
    return tx.client.queryp(transactionStatements[tx.options.mode][1], [])
      .catch(function (err) {
        tx.done(err);
        return Q.reject(err);
      }).then(function () {
        tx.done();
      });
  }
};