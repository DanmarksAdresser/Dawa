"use strict";

var apiSpecUtil = require('./apiSpecUtil');
var util        = require('util');
var eventStream = require('event-stream');
var _           = require('underscore');
var Readable    = require('stream').Readable;
var pg          = require('pg.js');
var winston     = require('winston');

/******************************************************************************/
/*** Configuration ************************************************************/
/******************************************************************************/

// var connString = "postgres://ahj@localhost/dawa2";
var connString = process.env.pgConnectionUrl;
winston.info("Loading dbapi with process.env.pgConnectionUrl=%s",connString);

function notNull(v) {
  return v !== undefined && v !== null;
}

exports.addSqlParameter = function(sqlParts, param) {
  sqlParts.sqlParams.push(param);
  return '$' + sqlParts.sqlParams.length;
};

exports.addWhereClause = function(sqlParts, clause) {
  sqlParts.whereClauses.push(clause);
};

function createQuery(parts){
  var sql = parts.select;
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
    var offsetAlias = exports.addSqlParameter(parts, parts.offset);
    sql += " OFFSET " + offsetAlias;
  }
  if(parts.limit) {
    var limitAlias = exports.addSqlParameter(parts, parts.limit);
    sql += " LIMIT " + limitAlias;
  }
  return {
    sql: sql,
    params: parts.sqlParams
  };
}

util.inherits(CursorStream, Readable);
function CursorStream(client, cursorName) {
  Readable.call(this, {
    objectMode: true,
    highWaterMark: 1000
  });
  this.client = client;
  this.cursorName = cursorName;
  this.maxFetchSize = 200;
  this.closed = false;
  this.moreRowsAvailable = true;
  this.queryInProgress = false;
}

CursorStream.prototype._doFetch = function(count) {
  var self = this;
  if(self.queryInProgress) {
    throw "Invalid state: Query already in progress";
  }
  if(!self.moreRowsAvailable) {
    return;
  }
  self.queryInProgress = true;
  var fetchSize = Math.min(self.maxFetchSize,count);
  var fetch = 'FETCH ' + fetchSize +' FROM ' + self.cursorName;
  self.client.query(fetch, [], function(err, result) {
    self.queryInProgress = false;
    if(err) {
      self.emit('error', err);
      return;
    }
    if(result.rows.length < fetchSize) {
      self.moreRowsAvailable = false;
    }
    result.rows.forEach(function(row) {
      self.push(row);
    });

    if(!self.moreRowsAvailable && !self.closed) {
      self.closed = true;
      self.push(null);
      var close = "CLOSE " + self.cursorName;
      winston.info("Closing cursor: %j", close, {});
      self.client.query(close, [], function() {});
      return;
    }
  });
};

CursorStream.prototype._read = function(count, cb) {
  var self = this;
  if(self.closed) {
    winston.info('attempted read from a closed source');
    return;
  }
  if(!self.queryInProgress) {
    self._doFetch(count);
  }
};

function streamingQueryUsingCursor(client, sql, params, cb) {
  sql = 'declare c1 NO SCROLL cursor for ' + sql;
  winston.info('executing sql: %j with params: %j', sql, params, {});
  client.query(
    sql,
    params, function (err, result) {
      if(err) {
        return cb(err);
      }
      cb(null, new CursorStream(client, 'c1'));
    }
  );
}

var transformToCsvObjects = function(rowStream, spec) {
  var fields = spec.fields;
  return eventStream.pipeline(
    rowStream,
    eventStream.mapSync(function(row) {
      return _.reduce(fields, function(memo, field) {
        // currently, all selectable fields are part of the CSV format
        if(field.selectable && field.selectable === false) {
          return memo;
        }
        var dbValue = row[apiSpecUtil.getColumnNameForSelect(spec, field.name)];
        var formattedValue;
        if(field.formatter) {
          formattedValue = field.formatter(dbValue);
        }
        else {
          formattedValue = dbValue;
        }
        memo[field.name] = formattedValue;
        return memo;
      }, {});
    })
  );
};

exports.withTransaction = function(cb) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      return cb(err);
    }
    client.query('BEGIN', [], function(err) {
      if(err) {
        done();
        return cb(err);
      }
      cb(err, client, function() {
        client.query('ROLLBACK', function(err) {});
        return done();
      });
    });
  });
};

exports.query = function(client, sqlParts, cb) {
  var query = createQuery(sqlParts);
  client.query(
    query.sql,
    query.params,
    function (err, result) {
      if(err) { return cb(err); }
      cb(null, result.rows || []);
    });
};

exports.stream = function(client, sqlParts, cb) {
  var query = createQuery(sqlParts);
  streamingQueryUsingCursor(client, query.sql, query.params, cb);
};

/**
 * Takes a stream of database rows and returns an object stream
 * with the specified mapping ('csv', 'json' or 'autocomplete')
 */
exports.transformToObjects = function(stream, spec, format, options) {
  if(format === 'csv') {
    return transformToCsvObjects(stream, spec);
  }
  if(!notNull(spec.mappers[format])) {
    throw "No mapper for " + format;
  }
  return eventStream.pipeline(stream,
    eventStream.mapSync(function(obj) { return spec.mappers[format](obj, options); })
  );
};
