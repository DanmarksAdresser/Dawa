"use strict";

var apiSpecUtil = require('./apiSpecUtil');
var util        = require('util');
var eventStream = require('event-stream');
var _           = require('underscore');
var Readable    = require('stream').Readable;
var apiSpec     = require('./apiSpec');
var pg          = require('pg');
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

function initialQuery(spec) {
  if(spec.baseQuery) {
    return spec.baseQuery();
  }
  var query = {
    select: "  SELECT * FROM " + spec.model.plural,
    whereClauses: [],
    orderClauses: [],
    offsetLimitClause: "",
    sqlParams: []
  };
  return query;
}

/**
 * Applies a list of parameters to a query by generating the
 * appropriate where clauses.
 */
function applyParameters(spec, parameterSpec, params, query) {
  parameterSpec.forEach(function (parameter) {
    var name = parameter.name;
    if (params[name] !== undefined) {
      query.sqlParams.push(params[name]);
      if (parameter.whereClause) {
        query.whereClauses.push(parameter.whereClause("$" + query.sqlParams.length, spec));
      } else {
        var column = apiSpecUtil.getColumnNameForWhere(spec, name);
        query.whereClauses.push(column + " = $" + query.sqlParams.length);
      }
    }
  });
}

function applyOffsetLimitClause(params, query) {
  if(notNull(params.offset) || notNull(params.limit)) {
    var clause = '';
    if(notNull(params.offset)) {
      query.sqlParams.push(params.offset);
      clause += ' OFFSET $' + query.sqlParams.length;
    }
    if(notNull(params.limit)) {
      query.sqlParams.push(params.limit);
      clause += ' LIMIT $' + query.sqlParams.length;
    }
    query.offsetLimitClause = clause;
  }
}

function applyOrderByKey(spec, sqlParts) {
  var columnArray = apiSpecUtil.getKeyForSelect(spec);
  columnArray.forEach(function (key) {
    sqlParts.orderClauses.push(apiSpecUtil.getColumnNameForSelect(spec, key));
  });
}

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
  if(parts.offsetLimitClause) {
    sql += parts.offsetLimitClause;
  }
  return {
    sql: sql,
    params: parts.sqlParams
  };
}

function createQueryFromSpec(spec, params, paging) {
  var sqlParts = initialQuery(spec);
  if(params.specified) {
    applyParameters(spec, spec.parameters, params.specified, sqlParts);
  }
  if(params.search) {
    applyParameters(spec, apiSpec.searchParameterSpec, params.search, sqlParts);
  }
  if(params.autocomplete) {
    applyParameters(spec, apiSpec.autocompleteParameterSpec, params.autocomplete, sqlParts);
  }
  if (paging) {
    applyOffsetLimitClause(paging, sqlParts);
  }
  applyOrderByKey(spec, sqlParts);
  var query = createQuery(sqlParts);
  return query;
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
        memo[field.name] = row[apiSpecUtil.getColumnNameForSelect(spec, field.name)];
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
    client.query('BEGIN READ ONLY', [], function(err) {
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
}

exports.query = function(client, spec, params, paging, cb) {
  var query = createQueryFromSpec(spec, params, paging);
  client.query(
    query.sql,
    query.params,
    function (err, result) {
      if(err) { return cb(err); }
      cb(null, result.rows || []);
    });
};

exports.streamingQuery = function(client, spec, params, paging, cb) {
  var query = createQueryFromSpec(spec, params, paging);
  streamingQueryUsingCursor(client, query.sql, query.params, cb);
};


/**
 * Takes a stream of database rows and returns an object stream
 * with the specified mapping ('csv', 'json' or 'autocomplete')
 */
exports.transformToObjects = function(stream, spec, format) {
  if(format === 'csv') {
    return transformToCsvObjects(stream, spec);
  }
  if(!notNull(spec.mappers[format])) {
    throw "No mapper for " + format;
  }
  return eventStream.pipeline(stream,
    eventStream.mapSync(spec.mappers[format])
  );
};
