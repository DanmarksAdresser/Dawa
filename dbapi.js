"use strict";

var Q = require('q');
var logger = require('./logger');
var statistics = require('./statistics');

var CursorStream = require('./cursor-stream');

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
      if(err) {
        logger.error('Failed executing query', {sql: sql, params: params, error: err});
        return cb(err);
      }
      return cb(null, new CursorStream(client, 'c1', sql));
    }
  );
}

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

module.exports =  {
  addSqlParameter: addSqlParameter,
  addWhereClause: addWhereClause,
  createQuery: createQuery,
  streamingQueryUsingCursor: streamingQueryUsingCursor,
  query: query,
  queryRaw: queryRaw,
  queryRawQ: Q.denodeify(queryRaw),
  stream: stream,
  streamRaw: streamingQueryUsingCursor
};
