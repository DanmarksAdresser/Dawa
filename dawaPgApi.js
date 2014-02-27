"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');
var _                = require('underscore');
var eventStream      = require('event-stream');
var util             = require('util');
var csv              = require('csv');
var parameterParsing = require('./parameterParsing');
var apiSpec          = require('./apiSpec');
var apiSpecUtil      = require('./apiSpecUtil');
var dbapi            = require('./dbapi');
var Transform        = require('stream').Transform;
var winston          = require('winston');

function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}

function baseUrl(req) {
  var protocol = req.connection.encrypted ? 'https' : 'http';
  return protocol + '://' + req.headers.host;
}

/******************************************************************************/
/*** Routes *******************************************************************/
/******************************************************************************/

exports.setupRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(corsMiddleware);

  apiSpec.allSpecNames.forEach(function(specName) {
    var spec = apiSpec[specName];
    if(spec.parameterGroups.autocomplete) {
      publishAutocomplete(app, spec);
    }
    publishGetByKey(app, spec);
    publishQuery(app, spec);
  });
  return app;
};

/**
 * Parses multiple groups of parameters.
 * @param parameterGroups a hash where values are lists of parameter specifications
 * @param rawParams the query parameters
 * @returns a hash where the values are the parsed parameters, plus an additional errors key that contains
 * an array of parsing errors.
 */
function parseParameters(parameterGroups, rawParams) {
  return _.reduce(parameterGroups, function(memo, parameterSpec, groupName) {
    var parseResult = parameterParsing.parseParameters(rawParams, _.indexBy(parameterSpec.parameters, 'name'));
    memo.errors = memo.errors.concat(parseResult.errors);
    memo[groupName] = parseResult.params;
    _.extend(memo.params, parseResult.params);
    return memo;
  }, {
    params: {},
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
    var parseParamsResult = parameterParsing.parseParameters(req.params, _.indexBy(spec.parameterGroups.propertyFilter.parameters, 'name'));
    if (parseParamsResult.errors.length > 0){
      var keyValues = _.reduce(keyArray, function(memo, key) {
        memo.push(req.params[key]);
        return memo;
      }, []);
      return sendResourceKeyFormatError(res, "The resource-key is ill-formed: " + keyValues.join(', ') + ". "+parseParamsResult.errors[0][1]);
    }

    // Parsing format parameters
    var formatParamsParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.formatParameterSpec.parameters, 'name'));
    if(formatParamsParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, formatParamsParseResult.errors);
    }

    var formatParams = formatParamsParseResult.params;


    var sqlParts = apiSpecUtil.createSqlParts(spec, {
      propertyFilter: spec.parameterGroups.propertyFilter
    }, parseParamsResult.params);

    // Getting the data
    withPsqlClient(res, function (client, done) {
      dbapi.query(client, sqlParts, function(err, rows) {
        done(err);
        if (err) {
          return sendPostgresQueryError(res, err);
        } else if (rows.length === 1) {
// TODO fix validation rules
//            var adr = spec.mappers.json(result.rows[0]);
//            spec.model.validate(adr)
//              .then(function (report) {
//                // The good case.  The rest is error handling!
          sendSingleResultToHttpResponse(rows[0], res, spec, {
            formatParams: formatParams,
            baseUrl: baseUrl(req)
          });
//              })
//              .catch(function (err) {
//                sendInternalServerError(res, err);
//              });
        } else if (rows.length > 1) {
          sendInternalServerError(res, "UUID: "+req.params.id+", results in more than one address: "+rows);
        } else {
          sendAddressNotFoundError(res, "UUID: "+req.params.id+", match no address");
        }
      });
    });
  });
}
function publishQuery(app, spec) {
  app.get('/' + spec.model.plural, function(req, res) {

    var parameterGroups = apiSpecUtil.getParameterGroupsForSpec(spec, ['propertyFilter', 'search', 'format', 'paging', 'crs', 'geomWithin'], apiSpec.formatParameterSpec, apiSpec.pagingParameterSpec);

    var parameterParseResult = parseParameters(parameterGroups, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    var params = parameterParseResult.params;

    var sqlParts = apiSpecUtil.createSqlParts(spec, parameterGroups, params);

    // Getting the data
    withPsqlClient(res, function(client, done) {
      dbapi.stream(client, sqlParts, function(err, stream) {
        if(err) {
          winston.error("Error executing cursor query: %j", err, {});
          done(err);
          return sendPostgresQueryError(res, err);
        }
        streamHttpResponse(stream, res, spec, {
          formatParams: parameterParseResult.format,
          baseUrl: baseUrl(req)
        }, done);
      });
    });
  });
}

function sendSingleResultToHttpResponse(result, res, spec, options, done) {
  done = done ? done : function() {};
  var format = options.formatParams.format;
  var callback = options.formatParams.callback;
  if(format === 'csv') {
    return streamCsvToHttpResponse(eventStream.readArray([result]), spec, res, done);
  }
  else if(callback) {
    setJsonpContentHeader(res);
    res.write(options.formatParams.callback + "(");
    res.write(jsonStringifyPretty(spec.mappers.json(result, { baseUrl: options.baseUrl })));
    res.end(");");
    done();
  }
  else {
    setJsonContentHeader(res);
    res.end(jsonStringifyPretty(spec.mappers.json(result, { baseUrl: options.baseUrl })));
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
  var callback = options.formatParams.callback;
  if(format === 'csv') {
    return streamCsvToHttpResponse(stream, spec, res, done);
  }

  var objectStream = dbapi.transformToObjects(stream, spec, 'json', { baseUrl: options.baseUrl });
  if(callback) {
    return streamJsonpToHttpResponse(objectStream, callback, res, done);
  }
  else {
    return streamJsonToHttpResponse(objectStream, res, done);
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
  var callback = options.formatParams.callback;
  if(format === 'csv') {
    // TODO autocomplete CSV responses?
    return sendInternalServerError(res, "CSV for autocomplete not supported");
  }
  var objectStream = dbapi.transformToObjects(stream, spec, 'autocomplete', {baseUrl: options.baseUrl } );
  if(callback) {
    return streamJsonpToHttpResponse(objectStream, options.formatParams.callback, res, done);
  }
  else {
    return streamJsonToHttpResponse(objectStream, res, done);
  }
}

/**
 * When autocompleting, if per_side is not specified, it defaults to 20.
 */
function applyDefaultPagingForAutocomplete(pagingParams) {
  if(!pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
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
    lineBreaks: 'windows',
    columns: _.pluck(_.filter(fields, function(field) {
      return field.selectable === undefined || field.selectable;
    }),'name')
  });
  var csvStream = eventStream.pipeline(
    dbapi.transformToObjects(rowStream, spec, 'csv', {}),
    csvTransformer
  );
  streamToHttpResponse(csvStream, res, {}, cb);

}


/******************************************************************************/
/*** Address Autocomplete *****************************************************/
/******************************************************************************/

function publishAutocomplete(app, spec) {
  app.get('/' + spec.model.plural + "/autocomplete", function(req, res) {
    var parameterGroups = apiSpecUtil.getParameterGroupsForSpec(spec, ['propertyFilter', 'format', 'paging', 'autocomplete'], apiSpec.formatParameterSpec, apiSpec.pagingParameterSpec);
    var parameterParseResult = parseParameters(parameterGroups, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    var params = parameterParseResult.params;

    applyDefaultPagingForAutocomplete(params);

    var sqlParts = apiSpecUtil.createSqlParts(spec, parameterGroups, params);

    // Getting the data
    withPsqlClient(res, function(client, done) {
      dbapi.stream(client, sqlParts, function(err, stream) {
        if(err) {
          done(err);
          return sendPostgresQueryError(res, err);
        }
        streamAutocompleteResponse(stream, res, spec, {
          formatParams: parameterParseResult.format,
          baseUrl: baseUrl(req)
        }, done);
      });
    });
  });
}

/******************************************************************************/
/*** Utility functions ********************************************************/
/******************************************************************************/

function withPsqlClient(res, callback) {
  return dbapi.withTransaction(function(err, client, done) {
    if (err) {
      // We do not have a connection to PostgreSQL.
      // Abort!
      sendInternalServerError(res, err);
      winston.error("Failed to obtain postgresql connection: %j", err, {});
      return done();
    }
    return callback(client, done);
  });
}

function setJsonpContentHeader(res) {
  res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
}

function jsonStringifyPretty(object){
  return JSON.stringify(object, undefined, 2);
}

util.inherits(JsonStringifyStream, Transform);
function JsonStringifyStream(replacer, space, beginText, endText) {
  Transform.call(this, {
    objectMode: true
  });
  this.replacer = replacer;
  this.space = space;
  this.headerWritten = false;
  this.beginText = beginText ? beginText : '[\n';
  this.endText = endText ? endText : '\n]';
}

JsonStringifyStream.prototype._flush = function(cb) {
  if(!this.headerWritten) {
    this.push(this.beginText);
  }
  this.push(this.endText);
  cb();
};

JsonStringifyStream.prototype._transform = function(chunk, encoding, cb) {
  var json = JSON.stringify(chunk, this.replacer, this.space);
  if(!this.headerWritten) {
    this.headerWritten = true;
    this.push(this.beginText);
  }
  else {
    this.push(',\n');
  }
  this.push(json);
  cb();
};

function transformJsonToText(objectStream) {
  return eventStream.pipeline(
    objectStream,
    new JsonStringifyStream(undefined, 2)
  );
}

function transformJsonToJsonpText(objectStream, callbackName) {
  return eventStream.pipeline(
    objectStream,
    new JsonStringifyStream(undefined, 2, callbackName +'([\n', '\n]);')
  );
}

function streamJsonpToHttpResponse(stream, callbackName, res, cb) {
  setJsonpContentHeader(res);
 streamToHttpResponse(transformJsonToJsonpText(stream, callbackName), res, {}, cb);
}

function setJsonContentHeader(res) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
}
function streamJsonToHttpResponse(stream, res, cb) {
  setJsonContentHeader(res);
  streamToHttpResponse(transformJsonToText(stream), res, {}, cb);
}

// pipe stream to HTTP response. Invoke cb when done. Pass error, if any, to cb.
function streamToHttpResponse(stream, res, options, cb) {

  res.on('error', function (err) {
    winston.error("An error occured while streaming data to HTTP response: %j", new Error(err), {});
    cb(err);
  });
  res.on('close', function () {
    winston.info("Client closed connection");
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

function sendQueryParameterFormatError(res, details){
  sendError(res, 400, {type: "QueryParameterFormatError",
                       title: "One or more query parameters was ill-formed.",
                       details: details});
}

function sendResourceKeyFormatError(res, details){
  sendError(res, 400, {type: "ResourceKeyFormatError",
                       title: "The resource-key was ill-formed.",
                       details: details});
}

function sendPostgresQueryError(res, details) {
  var msg = {type: "InvalidRequestError",
    title: "The request resulted in an invalid database query, probably due to bad query parameters",
    details: details.hint};
  winston.info("Postgres query error %j", msg, {});
  sendError(res, 400, msg);
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
  winston.error("Internal server error: %j", msg, {});
  sendError(res, 500, msg);
}

function sendError(res, code, message){
  res.statusCode = code;
//  winston.debug("Sending error message %j", message, {});
  res.setHeader('Content-Type', 'application/problem+json; charset=UTF-8');
  res.end(jsonStringifyPretty(message));
}
