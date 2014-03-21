"use strict";

var util        = require('util');
var Readable    = require('stream').Readable;
var pg          = require('pg.js');
var winston     = require('winston');

/******************************************************************************/
/*** Configuration ************************************************************/
/******************************************************************************/

// var connString = "postgres://ahj@localhost/dawa2";
var connString = process.env.pgConnectionUrl;
winston.info("Loading dbapi with process.env.pgConnectionUrl=%s",connString);

exports.addSqlParameter = function(sqlParts, param) {
  sqlParts.sqlParams.push(param);
  return '$' + sqlParts.sqlParams.length;
};

exports.addWhereClause = function(sqlParts, clause) {
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
  if(self.closed) {
    return;
  }
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
      console.log('error fetching ' + err);
      self.emit('error', err);
      self.push(null);
      self.client = null;
      self.closed = true;
      return;
    }
    if(result.rows.length < fetchSize) {
      self.moreRowsAvailable = false;
    }
    result.rows.forEach(function(row) {
      self.push(row);
    });

    if(!self.moreRowsAvailable && !self.closed) {
      self.push(null);
      self.closed = true;
      var close = "CLOSE " + self.cursorName;
      winston.info("Closing cursor: %j", close, {});
      self.client.query(close, [], function() {});
      self.client = null;
      return;
    }
  });
};

CursorStream.prototype._read = function(count) {
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
    params,
    function (err) {
      if(err) {
        return cb(err);
      }
      return cb(null, new CursorStream(client, 'c1'));
    }
  );
}

exports.withReadonlyTransaction = function(cb) {
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

exports.withRollbackTransaction = function(cb) {
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

exports.withWriteTransaction = function(cb) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      return cb(err);
    }
    client.query('BEGIN', [], function(err) {
      if(err) {
        done();
        return cb(err);
      }
      cb(err, client, function(err, committedCallback) {
        if(err) {
          return done(err);
        }
        client.query('COMMIT', committedCallback);
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