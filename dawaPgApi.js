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

  publishAutocomplete(app, apiSpec.vejnavnnavn);
  publishGetByKey(app, apiSpec.vejnavnnavn);
  publishQuery(app, apiSpec.vejnavnnavn);

  return app;
};

function publishGetByKey(app, spec) {
  app.get('/' + spec.model.plural + '/:' + spec.model.key, function (req, res) {

    // Parsing the path parameters, which constitutes the key

    var parseParamsResult = parameterParsing.parseParameters(req.params, _.indexBy(spec.parameters, 'name'));
    if (parseParamsResult.errors.length > 0){
      if (parseParamsResult.errors[0][0] == 'id' && parseParamsResult.errors.length == 1){
        // TODO The id is not necessarily a UUID
        return sendUUIDFormatError(res, "UUID is ill-formed: "+req.params.id+". "+parseParamsResult.errors[0][1]);
      } else {
        return sendInternalServerError(res, 'Unexpected query-parameter error: '+util.inspect(parseParamsResult.errors, {depth: 10}));
      }
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
            var adr = spec.mappers.json(result.rows[0]);
            spec.model.validate(adr)
              .then(function (report) {
                // The good case.  The rest is error handling!
                sendSingleResultToHttpResponse(result.rows[0], res, spec, {
                  formatParams: formatParams
                }, done);
              })
              .catch(function (err) {
                sendInternalServerError(res, err);
              });
          } else if (result.rows.length > 1) {
            sendInternalServerError(res, "UUID: "+req.params.id+", results in more than one address: "+result.rows);
          } else {
            sendAddressNotFoundError(res, "UUID: "+req.params.id+", match no address");
          }
        });
    });
  });
}

function publishQuery(app, spec) {
  app.get('/' + spec.model.plural, function(req, res) {

    // Parsing parameters specified by spec
    var specifiedParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(spec.parameters, 'name'));
    if (specifiedParamsParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, specifiedParamsParseResult.errors);
    }

    // Parsing format parameter
    var formatParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.formatParameterSpec, 'name'));
    if(formatParamsParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, formatParamsParseResult.errors);
    }
    var formatParams = formatParamsParseResult.params;

    // verify that the callback parameter is specified for jsonp format
    if(formatParams.format === 'jsonp' && formatParams.callback === undefined) {
      return sendJsonCallbackParameterMissingError(res);
    }

    // make the query string
    var sqlParts = initialQuery(spec);

    applyParameters(spec, spec.parameters, specifiedParamsParseResult.params, sqlParts);

    // parse and apply paging parameters
    if(spec.pageable) {
      var pagingParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.pagingParameterSpec, 'name'));
      if(pagingParamsParseResult.errors.length > 0) {
        return sendQueryParameterFormatError(res, pagingParamsParseResult.errors);
      }
      applyDefaultPaging(pagingParamsParseResult.params);
      sqlParts.offsetLimitClause = createOffsetLimitClause(pagingParamsParseResult.params);
    }

    // Parse and apply search-parameter
    if(spec.searchable) {
      var searchParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.searchParameterSpec, 'name'));
      if (searchParamsParseResult.errors.length > 0){
        return sendQueryParameterFormatError(res, searchParamsParseResult.errors);
      }
      applyParameters(spec, apiSpec.searchParameterSpec, searchParamsParseResult.params, sqlParts);
    }

    sqlParts.orderClauses.push(spec.model.key);

    var sqlString = createSqlQuery(sqlParts);

    console.log('executing sql' + JSON.stringify({sql: sqlString, params: sqlParts.sqlParams}));

    // Getting the data
    withPsqlClient(res, function(client, done) {
      var stream = streamingQuery(client, sqlString, sqlParts.sqlParams);
      streamHttpResponse(stream, res, spec, {
        formatParams: formatParams
      }, done);
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
        query.whereClauses.push(parameter.whereClause("$" + query.sqlParams.length));
      } else {
        var column = spec.fieldMap[name].column || name;
        query.whereClauses.push(column + " = $" + query.sqlParams.length);
      }
    }
  });
}

function initialQuery(spec) {
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
        memo[field.name] = row[field.column || field.name];
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
/******************************************************************************/

function publishAutocomplete(app, spec) {
  app.get('/' + spec.model.plural + "/autocomplete", function(req, res) {
    // Parsing parameters specified by spec
    var specifiedParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(spec.parameters, 'name'));
    if (specifiedParamsParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, specifiedParamsParseResult.errors);
    }

    // Parsing format parameter
    var formatParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.formatParameterSpec, 'name'));
    if(formatParamsParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, formatParamsParseResult.errors);
    }
    var formatParams = formatParamsParseResult.params;

    // verify that the callback parameter is specified for jsonp format
    if(formatParams.format === 'jsonp' && formatParams.callback === undefined) {
      return sendJsonCallbackParameterMissingError(res);
    }

    // make the query string
    var sqlParts = initialQuery(spec);

    applyParameters(spec, spec.parameters, specifiedParamsParseResult.params, sqlParts);

    // parse and apply paging parameters
    if(spec.pageable) {
      var pagingParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.pagingParameterSpec, 'name'));
      if(pagingParamsParseResult.errors.length > 0) {
        return sendQueryParameterFormatError(res, pagingParamsParseResult.errors);
      }
      applyDefaultPaging(pagingParamsParseResult.params);
      sqlParts.offsetLimitClause = createOffsetLimitClause(pagingParamsParseResult.params);
    }

    // Parse and apply autocomplete parameter
    var autocompleteParams = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.autocompleteParameterSpec, 'name'));
    if (autocompleteParams.errors.length > 0){
      return sendQueryParameterFormatError(res, autocompleteParams.errors);
    }
    applyParameters(spec, apiSpec.autocompleteParameterSpec, autocompleteParams.params, sqlParts);

    // ensure stable ordering, which is required for paging
    sqlParts.orderClauses.push(spec.model.key);

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

//function doAddressAutocomplete(req, res) {
//  var q = req.query.q;
//
//  var tsq = toPgSuggestQuery(q);
//
//  var postnr = req.query.postnr;
//
//  var args = [tsq];
//  if (postnr) {
//    args.push(postnr);
//  }
//
//  withPsqlClient(res, function (client, done) {
//    // Search vejnavne first
//    // TODO check, at DISTINCT ikke unorder vores resultat
//    var vejnavneSql = 'SELECT DISTINCT vejnavn FROM (SELECT * FROM Vejnavne, to_tsquery(\'vejnavne\', $1) query WHERE (tsv @@ query)';
//
//    if (postnr) {
//      vejnavneSql += ' AND EXISTS (SELECT * FROM Enhedsadresser WHERE vejkode = Vejnavne.kode AND kommunekode = Vejnavne.kommunekode AND postnr = $2)';
//    }
//
//    vejnavneSql += 'ORDER BY ts_rank(Vejnavne.tsv, query) DESC) AS v LIMIT 10';
//
//    client.query(vejnavneSql, args, function (err, result) {
//      if (err) {
//        console.error('error running query', err);
//        // TODO reportErrorToClient(...)
//        return done(err);
//      }
//      if (result.rows.length > 1) {
//        streamJsonToHttpResponse(eventStream.readArray(result.rows), vejnavnRowToSuggestJson, res, done);
//        return;
//      }
//
//      var sql = 'SELECT * FROM Adresser, to_tsquery(\'vejnavne\', $1) query  WHERE (tsv @@ query)';
//      if (postnr) {
//        sql += ' AND postnr = $2';
//      }
//      sql += ' ORDER BY ts_rank(Adresser.tsv, query) DESC';
//
//      sql += ' LIMIT 10';
//
//
//      var queryStream = streamingQuery(client, sql, args);
//      streamJsonToHttpResponse(queryStream, adresseRowToSuggestJson, res, done);
//    });
//  });
//}

/******************************************************************************/
/*** Utility functions ********************************************************/
/******************************************************************************/

function withPsqlClient(res, callback) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      // We do not have a connection to PostgreSQL.
      // About!
      sendInternalServerError(res, err);
      process.exit(1);
    }
    callback(client, done);
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

function sendUUIDFormatError(res, details){
  sendError(res, 400, {type: "UUIDFormatError",
                       title: "The address-UUID was ill-formed.",
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