"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express     = require('express');
var JSONStream  = require('JSONStream');
var _           = require('underscore');
var pg          = require('pg');
var QueryStream = require('pg-query-stream');
var eventStream = require('event-stream');
var utility     = require('./utility');
var util        = require('util');
var csv         = require('csv');
var parameterParsing = require('./parameterParsing');
var apiSpec = require('./apiSpec');
var apiSpecUtil = require('./apiSpecUtil');
var Readable = require('stream').Readable;



/******************************************************************************/
/*** Configuration ************************************************************/
/******************************************************************************/

//var connString = "postgres://pmm@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";
// var connString = "postgres://ahj@localhost/dawa2";
var connString = process.env.pgConnectionUrl;
console.log("Loading dawaPgApi with process.env.pgConnectionUrl="+connString);


/******************************************************************************/
/*** Routes *******************************************************************/
/******************************************************************************/

exports.setupRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  publishAutocomplete(app, apiSpec.adresse);
  publishGetByKey(app, apiSpec.adresse);
  publishQuery(app, apiSpec.adresse);

  publishAutocomplete(app, apiSpec.vejnavn);
  publishGetByKey(app, apiSpec.vejnavn);
  publishQuery(app, apiSpec.vejnavn);

  publishAutocomplete(app, apiSpec.postnummer);
  publishGetByKey(app, apiSpec.postnummer);
  publishQuery(app, apiSpec.postnummer);

  publishAutocomplete(app, apiSpec.vejstykke);
  publishGetByKey(app, apiSpec.vejstykke);
  publishQuery(app, apiSpec.vejstykke);

  publishAutocomplete(app, apiSpec.kommune);
  publishGetByKey(app, apiSpec.kommune);
  publishQuery(app, apiSpec.kommune);

  publishAutocomplete(app, apiSpec.supplerendeBynavn);
  publishGetByKey(app, apiSpec.supplerendeBynavn);
  publishQuery(app, apiSpec.supplerendeBynavn);

  publishAutocomplete(app, apiSpec.adgangsadresse);
  publishGetByKey(app, apiSpec.adgangsadresse);
  publishQuery(app, apiSpec.adgangsadresse);
  return app;
};

exports.setupPublicRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  publishAutocomplete(app, apiSpec.postnummer);
  publishGetByKey(app, apiSpec.postnummer);
  publishQuery(app, apiSpec.postnummer);

  publishAutocomplete(app, apiSpec.vejnavn);
  publishGetByKey(app, apiSpec.vejnavn);
  publishQuery(app, apiSpec.vejnavn);

  publishAutocomplete(app, apiSpec.vejstykke);
  publishGetByKey(app, apiSpec.vejstykke);
  publishQuery(app, apiSpec.vejstykke);

  publishAutocomplete(app, apiSpec.supplerendeBynavn);
  publishGetByKey(app, apiSpec.supplerendeBynavn);
  publishQuery(app, apiSpec.supplerendeBynavn);

  publishAutocomplete(app, apiSpec.adgangsadresse);
  publishGetByKey(app, apiSpec.adgangsadresse);
  publishQuery(app, apiSpec.adgangsadresse);
  return app;
};

/**
 * Parses multiple groups of parameters.
 * @param parameterSpecs a hash where values are lists of parameter specifications
 * @param rawParams the query parameters
 * @returns a hash where the values are the parsed parameters, plus an additional errors key that contains
 * an array of parsing errors.
 */
function parseParameters(parameterSpecs, rawParams) {
  return _.reduce(parameterSpecs, function(memo, parameterSpec, groupName) {
    var parseResult = parameterParsing.parseParameters(rawParams, _.indexBy(parameterSpec, 'name'));
    memo.errors = memo.errors.concat(parseResult.errors);
    memo[groupName] = parseResult.params;
    return memo;
  }, {
    errors: []
  });
}

function publishGetByKey(app, spec) {
var keyArray = apiSpecUtil.getKeyForFilter(spec);

  var path = _.reduce(keyArray, function(memo, key) {

    return memo + '/:' + key;
  }, '/' + spec.model.plural);
  app.get(path, function (req, res) {
    // Parsing the path parameters, which constitutes the key
    var parseParamsResult = parameterParsing.parseParameters(req.params, _.indexBy(spec.parameters, 'name'));
    if (parseParamsResult.errors.length > 0){
      var keyValues = _.reduce(keyArray, function(memo, key) {
        memo.push(req.params[key]);
        return memo;
      }, []);
      return sendResourceKeyFormatError(res, "The resource-key is ill-formed: " + keyValues.join(', ') + ". "+parseParamsResult.errors[0][1]);
    }

    // Parsing format parameters
    var formatParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.formatParameterSpec, 'name'));
    if(formatParamsParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, formatParamsParseResult.errors);
    }

    var formatParams = formatParamsParseResult.params;
    if(formatParams.format === 'jsonp' && formatParams.callback === undefined) {
      return sendJsonCallbackParameterMissingError(res);
    }

    // Making the query string
    // make the query string
    var sqlParts = initialQuery(spec);

    applyParameters(spec, spec.parameters, parseParamsResult.params, sqlParts);

    var sqlString = createSqlQuery(sqlParts);

    // Getting the data
    withPsqlClient(res, function (client, done) {
      client.query(
        sqlString,
        sqlParts.sqlParams,
        function (err, result) {
          done();
          if (err) {
            sendInternalServerError(res, err);
          } else if (result.rows.length === 1) {
// TODO fix validation rules
//            var adr = spec.mappers.json(result.rows[0]);
//            spec.model.validate(adr)
//              .then(function (report) {
//                // The good case.  The rest is error handling!
                sendSingleResultToHttpResponse(result.rows[0], res, spec, {
                  formatParams: formatParams
                }, done);
//              })
//              .catch(function (err) {
//                sendInternalServerError(res, err);
//              });
          } else if (result.rows.length > 1) {
            sendInternalServerError(res, "UUID: "+req.params.id+", results in more than one address: "+result.rows);
          } else {
            sendAddressNotFoundError(res, "UUID: "+req.params.id+", match no address");
          }
        });
    });
  });
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
  console.log("Fetching new set of rows: "+fetch);
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
      console.log("Closing cursor: "+close);
      self.client.query(close, [], function() {});
      return;
    }
  });
};


CursorStream.prototype._read = function(count, cb) {
  var self = this;
  if(self.closed) {
    console.log('attempted read from a closed source');
    return;
  }
  if(!self.queryInProgress) {
    self._doFetch(count);
  }
};

function streamingQueryUsingCursor(client, sql, params, cb) {
  sql = 'declare c1 NO SCROLL cursor for ' + sql;
  console.log("executing sql " + JSON.stringify({sq: sql, params: params}));
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

function publishQuery(app, spec) {
  app.get('/' + spec.model.plural, function(req, res) {

    var parameterGroups = {
      specified: spec.parameters,
      format: apiSpec.formatParameterSpec
    };
    if(spec.pageable) {
      parameterGroups.paging = apiSpec.pagingParameterSpec;
    }
    if(spec.searchable) {
      parameterGroups.search = apiSpec.searchParameterSpec;
    }
    var parameterParseResult = parseParameters(parameterGroups, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    var specifiedParams = parameterParseResult.specified;
    var formatParams = parameterParseResult.format;

    // Parsing format parameter

    // verify that the callback parameter is specified for jsonp format
    if(formatParams.format === 'jsonp' && formatParams.callback === undefined) {
      return sendJsonCallbackParameterMissingError(res);
    }

    // make the query string
    var sqlParts = initialQuery(spec);

    applyParameters(spec, spec.parameters, specifiedParams, sqlParts);

    // parse and apply paging parameters
    var pagingParams = {};
    if(spec.pageable) {
      pagingParams = parameterParseResult.paging;
      applyDefaultPaging(pagingParams);
      sqlParts.offsetLimitClause = createOffsetLimitClause(pagingParams);
    }

    // Parse and apply search-parameter
    if(spec.searchable) {
      applyParameters(spec, apiSpec.searchParameterSpec, parameterParseResult.search, sqlParts);
    }

    addOrderByKey(spec, sqlParts);

    var sqlString = createSqlQuery(sqlParts);

    // Getting the data
    withPsqlClient(res, function(client, done) {
      streamingQueryUsingCursor(client, sqlString, sqlParts.sqlParams, function(err, stream) {
        if(err) {
          console.log("Error executing cursor query");
          done();
          throw err;
        }
        streamHttpResponse(stream, res, spec, {
          formatParams: formatParams
        }, done);
      });
    });
  });
}

function sendSingleResultToHttpResponse(result, res, spec, options, done) {
  var format = options.formatParams.format;
  if(format === 'csv') {
    return streamCsvToHttpResponse(eventStream.readArray([result]), spec, res, done);
  }
  else if(format === 'jsonp') {
    setJsonpContentHeader(res);
    res.write(options.formatParams.callback + "(");
    res.write(JSON.stringify(spec.mappers.json(result)));
    res.end(");");
    done();
  }
  else {
    setJsonContentHeader(res);
    res.end(JSON.stringify(spec.mappers.json(result)));
    done();
  }
}

/**
 * Sends a stream DB query rows to the http response in the appropriate format
 * @param stream a stream of database rows
 * @param res http response
 * @param spec the api spec
 * @param options must contain formatParams
 * @param done called upon completion
 */
function streamHttpResponse(stream, res, spec, options, done) {
  var format = options.formatParams.format;
  if(format === 'csv') {
    return streamCsvToHttpResponse(stream, spec, res, done);
  }
  else if(format === 'jsonp') {
    return streamJsonpToHttpResponse(stream, spec.mappers.json, options.formatParams.callback, res, done);
  }
  else {
    return streamJsonToHttpResponse(stream, spec.mappers.json, res, done);
  }
}

/**
 * Sends a stream DB query rows to the http response in the appropriate format
 * @param stream a stream of database rows
 * @param res http response
 * @param spec the api spec
 * @param options must contain formatParams
 * @param done called upon completion
 */
function streamAutocompleteResponse(stream, res, spec, options, done) {
  var format = options.formatParams.format;
  if(format === 'csv') {
    // TODO autocomplete CSV responses?
    return sendInternalServerError(res, "CSV for autocomplete not implemented");
  }
  else if(format === 'jsonp') {
    return streamJsonpToHttpResponse(stream, spec.mappers.autocomplete, options.formatParams.callback, res, done);
  }
  else {
    return streamJsonToHttpResponse(stream, spec.mappers.autocomplete, res, done);
  }
}

/**
 * When autocompleting, if per_side is not specified, it defaults to 20.
 */
function applyDefaultPagingForAutocomplete(pagingParams) {
  if(!pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
  applyDefaultPaging(pagingParams);
}

/**
 * By default, if per_side is specified, side defaults to 1.
 * If side is specified, per_side defaults to 20.
 * @param pagingParams
 */
function applyDefaultPaging(pagingParams) {
  if(pagingParams.per_side && !pagingParams.side) {
    pagingParams.side = 1;
  }
  if(pagingParams.side && !pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
}

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

function setCsvContentHeader(res) {
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
}

function streamCsvToHttpResponse(rowStream, spec, res, cb) {
  var fields = spec.fields;
  setCsvContentHeader(res);
  var csvTransformer = csv();
  csvTransformer.to.options({
    header: true,
    columns: _.pluck(fields,'name')
  });
  var csvStream = eventStream.pipeline(
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
    }),
    csvTransformer
  );
  streamToHttpResponse(csvStream, res, {}, cb);

}

function createSqlQuery(parts){
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
  return sql;
}

function createOffsetLimitClause(params) {
  var paging = utility.paginering(params);
  if(paging.status === 1) {
    return ' OFFSET ' + paging.skip + ' LIMIT ' + paging.limit;
  }
  else if(paging.status === 2) {
    // TODO send client error?
    return '';
  }
  else {
    return '';
  }
}

/******************************************************************************/
/*** Address Autocomplete *****************************************************/
function addOrderByKey(spec, sqlParts) {
  var keyArray = apiSpecUtil.getKeyForSelect(spec);
  keyArray.forEach(function (key) {
    sqlParts.orderClauses.push(apiSpecUtil.getColumnNameForSelect(spec, key));
  });
}
/******************************************************************************/

function publishAutocomplete(app, spec) {
  app.get('/' + spec.model.plural + "/autocomplete", function(req, res) {
    var parameterGroups = {
      specified: spec.parameters,
      format: apiSpec.formatParameterSpec,
      paging: apiSpec.pagingParameterSpec,
      autocomplete: apiSpec.autocompleteParameterSpec

    };
    var parameterParseResult = parseParameters(parameterGroups, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    var specifiedParams = parameterParseResult.specified;
    var formatParams = parameterParseResult.format;
    var pagingParams = parameterParseResult.paging;
    var autocompleteParams = parameterParseResult.autocomplete;

    // verify that the callback parameter is specified for jsonp format
    if(formatParams.format === 'jsonp' && formatParams.callback === undefined) {
      return sendJsonCallbackParameterMissingError(res);
    }

    // make the query string
    var sqlParts = initialQuery(spec);

    applyParameters(spec, spec.parameters, specifiedParams, sqlParts);

    applyDefaultPagingForAutocomplete(pagingParams);
    sqlParts.offsetLimitClause = createOffsetLimitClause(pagingParams);

    applyParameters(spec, apiSpec.autocompleteParameterSpec, autocompleteParams, sqlParts);

    // ensure stable ordering, which is required for paging
    addOrderByKey(spec, sqlParts);
    var sqlString = createSqlQuery(sqlParts);

    console.log('executing sql' + JSON.stringify({sql: sqlString, params: sqlParts.sqlParams}));

    // Getting the data
    withPsqlClient(res, function(client, done) {
      var stream = streamingQuery(client, sqlString, sqlParts.sqlParams);
      streamAutocompleteResponse(stream, res, spec, {
        formatParams: formatParams
      }, done);
    });
  });
}

/******************************************************************************/
/*** Utility functions ********************************************************/
/******************************************************************************/

function withPsqlClient(res, callback) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      // We do not have a connection to PostgreSQL.
      // Abort!
      sendInternalServerError(res, err);
      return process.exit(1);
    }
    client.query('BEGIN READ ONLY', [], function(err) {
      if(err) {
        sendInternalServerError(res, err);
        return done();
      }
      callback(client, function() {
        client.query('ROLLBACK', function(err) {});
        return done();
      });
    });
  });
}

function setJsonpContentHeader(res) {
  res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
}
function streamJsonpToHttpResponse(stream, mapper, callbackName, res, done) {
  setJsonpContentHeader(res);
  var jsonStream = createJsonStream(stream, mapper);
  res.write(callbackName + "(");
  streamToHttpResponse(jsonStream, res, { end: false }, function(err) {
    if(err) {
      return done(err);
    }
    res.end(");");
    done();
  });

}

function createJsonStream(stream, mapper) {
  return eventStream.pipeline(stream,
    eventStream.mapSync(mapper),
    JSONStream.stringify()
  );
}
function setJsonContentHeader(res) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
}
function streamJsonToHttpResponse(stream, mapper, res, cb) {
  setJsonContentHeader(res);
  var transformedStream = createJsonStream(stream, mapper);
  streamToHttpResponse(transformedStream, res, {}, cb);
}

// pipe stream to HTTP response. Invoke cb when done. Pass error, if any, to cb.
function streamToHttpResponse(stream, res, options, cb) {

  res.on('error', function (err) {
    console.error("An error occured while streaming data to HTTP response", new Error(err));
    cb(err);
  });
  res.on('close', function () {
    console.log("Client closed connection");
    cb("Client closed connection");
  });
  if(options.end === false) {
    stream.on('end', cb);
  }
  else {
    res.on('finish', cb);
  }
  stream.pipe(res, options);
}

function streamingQuery(client, sql, params) {
  return client.query(new QueryStream(sql, params, {batchSize: 10000}));
}

function sendQueryParameterFormatError(res, details){
  sendError(res, 400, {type: "QueryParameterFormatError",
                       title: "One or more query parameters was ill-formed.",
                       details: details});
}

function sendJsonCallbackParameterMissingError(res) {
  sendError(res, 400, {type: "JsonCallbackParameterMissingError",
    title: "When using JSONP, a callback parameter must be speficied",
    details: "When using JSONP, a callback parameter must be speficied"});
}

function sendResourceKeyFormatError(res, details){
  sendError(res, 400, {type: "ResourceKeyFormatError",
                       title: "The resource-key was ill-formed.",
                       details: details});
}

function sendAddressNotFoundError(res, details){
  sendError(res, 404, {type: "AddressNotFoundError",
                       title: "The given UUID does not match any address.",
                       details: details});
}

function sendInternalServerError(res, details){
  var msg = {type: "InternalServerError",
             title: "Something unexpected happened inside the server.",
             details: details};
  console.log("Internal server error: "+util.inspect(msg, {depth: 20}));
  sendError(res, 500, msg);
}

function sendError(res, code, message){
  res.setHeader('Content-Type', 'application/problem+json; charset=UTF-8');
  res.send(code, JSON.stringify(message));
}
