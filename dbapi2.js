"use strict";

var pg          = require('pg.js');
var logger = require('./logger');

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
      sql +=  " WHERE " + parts.whereClauses.join(" AND ");
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
        if(err) {
          return cb(err);
        }
        return cb(null, new CursorStream(client, 'c1'));
      }
    );
  }

  var withReadonlyTransaction = function(cb) {
    return pg.connect(connString, function (err, client, done) {
      if (err) {
        return cb(err);
      }
      client.query('BEGIN READ ONLY', [], function(err) {
        if(err) {
          done();
          return cb(err);
        }
        cb(err, client, function(err) {
          if(err) {
            return done(err);
          }
          client.query('ROLLBACK', function(err) {
            return done(err);
          });
        });
      });
    });
  };

  var withRollbackTransaction = function(cb) {
    return pg.connect(connString, function (err, client, done) {
      if (err) {
        return cb(err);
      }
      client.query('BEGIN', [], function(err) {
        if(err) {
          done();
          return cb(err);
        }
        cb(err, client, function(cb) {
          client.query('ROLLBACK', function(err) {});
          done();
          if(cb) {
            cb(null);
          }
        });
      });
    });
  };

  var withWriteTransaction = function(cb) {
    return pg.connect(connString, function (err, client, done) {
      if (err) {
        return cb(err);
      }
      client.query('BEGIN', [], function(err) {
        if(err) {
          done(err);
          return cb(err);
        }
        cb(err, client, function(err, committedCallback) {
          if(err) {
            logger.error('sql', "Error during transaction, discarding postgres connection", err);
            done(err);
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
            done(err);
            committedCallback(err);
          });
        });
      });
    });
  };

  var query = function(client, sqlParts, cb) {
    var query = createQuery(sqlParts);
    logger.info('sql', 'executing sql query', {sql: query.sql, params: query.params});
    client.query(
      query.sql,
      query.params,
      function (err, result) {
        if(err) { return cb(err); }
        cb(null, result.rows || []);
      });
  };

  var stream = function(client, sqlParts, cb) {
    var query = createQuery(sqlParts);
    streamingQueryUsingCursor(client, query.sql, query.params, cb);
  };

  return {
    addSqlParameter: addSqlParameter,
    addWhereClause: addWhereClause,
    createQuery: createQuery,
    streamingQueryUsingCursor: streamingQueryUsingCursor,
    withReadonlyTransaction: withReadonlyTransaction,
    withRollbackTransaction: withRollbackTransaction,
    withWriteTransaction: withWriteTransaction,
    query: query,
    stream: stream
  };
};