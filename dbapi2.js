"use strict";

var Q = require('q');
var pg          = require('pg.js');
require('./setupDbConnection');
var logger = require('./logger');
var statistics = require('./statistics');

var CursorStream = require('./cursor-stream');

module.exports = function(options) {
  var connString = options.dbUrl;

  var addSqlParameter = function(sqlParts, param) {
    sqlParts.sqlParams.push(param);
    return '$' + sqlParts.sqlParams.length;
  };

  var addWhereClause = function(sqlParts, clause) {
    sqlParts.whereClauses.push(clause);
  };

  function createQuery(parts){
    var sql =  'SELECT ' + parts.select.join(', ');
    if(parts.from && parts.from.length !== 0) {
      sql += ' FROM ' + parts.from.join(' ');
    }
    if(parts.whereClauses.length > 0) {
      sql +=  " WHERE (" + parts.whereClauses.join(") AND( ") + ')';
    }
    if(parts.groupBy) {
      sql += ' GROUP BY ' + parts.groupBy;
    }
    if(parts.orderClauses.length > 0) {
      sql += " ORDER BY " + parts.orderClauses.join(", ");
    }
    if(parts.offset) {
      var offsetAlias = addSqlParameter(parts, parts.offset);
      sql += " OFFSET " + offsetAlias;
    }
    if(parts.limit) {
      var limitAlias = addSqlParameter(parts, parts.limit);
      sql += " LIMIT " + limitAlias;
    }
    return {
      sql: sql,
      params: parts.sqlParams
    };
  }


  function streamingQueryUsingCursor(client, sql, params, cb) {
    sql = 'declare c1 NO SCROLL cursor for ' + sql;
    logger.info('sql', 'Creating cursor', {sql: sql, params: params });
    client.query(
      sql,
      params,
      function (err) {
        logger.error('Failed executing query', {sql: sql, params: params});
        if(err) {
          return cb(err);
        }
        return cb(null, new CursorStream(client, 'c1', sql));
      }
    );
  }

  var withConnection = function(cb) {
    var before = Date.now();
    return pg.connect(connString, function (err, client, done) {
      statistics.emit('psql_acquire_connection', Date.now() - before, err);
      cb(err, client, done);
    });
  };

  var withReadonlyTransaction = function(cb, shouldAbort) {
    return withConnection(function(err, client, done) {
      if(shouldAbort && shouldAbort()) {
        done();
        return cb(new Error('Connection acquisition aborted, probably because it can no longer be used (e.g. client has closed connection'));
      }
      function endTransaction(err) {
        client.emit('transactionEnd', err);
        done(err);
      }
      if (err) {
        logger.error("sql", "Failed to obtain PostgreSQL connection", err);
        return cb(err);
      }
      client.query('BEGIN READ ONLY', [], function(err) {
        if(err) {
          done(err);
          return cb(err);
        }
        cb(err, client, function(err) {
          if(err) {
            return endTransaction(err);
          }
          client.query('ROLLBACK', function(err) {
            return endTransaction(err);
          });
        });
      });
    });
  };

  var withRollbackTransaction = function(cb) {
    return withConnection(function(err, client, done) {
      function endTransaction(err) {
        client.emit('transactionEnd', err);
        done(err);
      }
      if (err) {
        return cb(err);
      }
      client.query('BEGIN', [], function(err) {
        if(err) {
          endTransaction();
          return cb(err);
        }
        cb(err, client, function(cb) {
          client.query('ROLLBACK', function(err) {});
          endTransaction();
          if(cb) {
            cb(null);
          }
        });
      });
    });
  };

  var withWriteTransaction = function(cb) {
    return withConnection(function(err, client, done) {
      function endTransaction(err) {
        client.emit('transactionEnd', err);
        done(err);
      }
      if (err) {
        return cb(err);
      }
      client.query('BEGIN ISOLATION LEVEL SERIALIZABLE', [], function(err) {
        if(err) {
          endTransaction(err);
          return cb(err);
        }
        cb(err, client, function(err, committedCallback) {
          if(err) {
            logger.error('sql', "Error during transaction, discarding postgres connection", err);
            endTransaction(err);
            committedCallback(err);
            return;
          }
          client.query('COMMIT', function(err) {
            if(err) {
              logger.error('sql', "Error when committing transaction", err);
            }
            else {
              logger.debug('sql', "write transaction commited successfully");
            }
            endTransaction(err);
            committedCallback(err);
          });
        });
      });
    });
  };

  var query = function(client, sqlParts, cb) {
    var query = createQuery(sqlParts);
    queryRaw(client, query.sql, query.params, cb);
  };

  var queryRaw = function(client, sql, params, cb) {
    logger.info('sql', 'executing sql query', {sql: sql, params: params});
    var before = Date.now();
    client.query(
      sql,
      params,
      function (err, result) {
        statistics.emit('psql_query', Date.now() - before, err, { sql: sql, params: params });
        if(err) {
          return cb(err);
        }
        cb(null, result.rows || []);
      });
  };


  var stream = function(client, sqlParts, cb) {
    var query = createQuery(sqlParts);
    streamingQueryUsingCursor(client, query.sql, query.params, cb);
  };


  function getPoolStatus() {
    var pool = pg.pools.getOrCreate(connString);
    return {
      size: pool.getPoolSize(),
      availableObjectsCount: pool.availableObjectsCount(),
      waitingClientsCount: pool.waitingClientsCount()
    };
  }

  return {
    addSqlParameter: addSqlParameter,
    addWhereClause: addWhereClause,
    createQuery: createQuery,
    streamingQueryUsingCursor: streamingQueryUsingCursor,
    withReadonlyTransaction: withReadonlyTransaction,
    withRollbackTransaction: withRollbackTransaction,
    withWriteTransaction: withWriteTransaction,
    query: query,
    queryRaw: queryRaw,
    queryRawQ: Q.denodeify(queryRaw),
    stream: stream,
    streamRaw: streamingQueryUsingCursor,
    getPoolStatus: getPoolStatus
  };
};