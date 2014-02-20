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

function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
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
    if(spec.suggestable) {
      publishAutocomplete(app, spec);
    }
    publishGetByKey(app, spec);
    publishQuery(app, spec);
  });
  return app;
};

exports.setupPublicRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(corsMiddleware);
  var specs = ['vejnavn', 'vejstykke', 'supplerendeBynavn', 'adgangsadresse', 'postnummer', 'kommune'];
  specs.forEach(function(specName) {
    var spec = apiSpec[specName];
    if(spec.suggestable) {
      publishAutocomplete(app, spec);
    }
    publishGetByKey(app, spec);
    publishQuery(app, spec);
  });
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

    // Getting the data
    withPsqlClient(res, function (client, done) {
      dbapi.query(client, spec, { specified: parseParamsResult.params }, {}, function(err, rows) {
        done();
        if (err) {
          sendInternalServerError(res, err);
        } else if (rows.length === 1) {
// TODO fix validation rules
//            var adr = spec.mappers.json(result.rows[0]);
//            spec.model.validate(adr)
//              .then(function (report) {
//                // The good case.  The rest is error handling!
          sendSingleResultToHttpResponse(rows[0], res, spec, {
            formatParams: formatParams
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

function toOffsetLimit(paging) {
  if(paging.side && paging.per_side) {
    return {
      offset: (paging.side-1) * paging.per_side,
      limit: paging.per_side
    };
  }
  else {
    return {};
  }
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


    // parse and apply paging parameters
    var pagingParams = {};
    if(spec.pageable) {
      pagingParams = parameterParseResult.paging;
      applyDefaultPaging(pagingParams);
    }


    var params = {
      specified: specifiedParams,
      search: parameterParseResult.search
    };

    // Getting the data
    withPsqlClient(res, function(client, done) {
      dbapi.streamingQuery(client, spec, params, toOffsetLimit(pagingParams), function(err, stream) {
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
  done = done ? done : function() {};
  var format = options.formatParams.format;
  if(format === 'csv') {
    return streamCsvToHttpResponse(eventStream.readArray([result]), spec, res, done);
  }
  else if(format === 'jsonp') {
    setJsonpContentHeader(res);
    res.write(options.formatParams.callback + "(");
    res.write(jsonStringifyPretty(spec.mappers.json(result)));
    res.end(");");
    done();
  }
  else {
    setJsonContentHeader(res);
    res.end(jsonStringifyPretty(spec.mappers.json(result)));
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

  var objectStream = dbapi.transformToObjects(stream, spec, 'json');
  if(format === 'jsonp') {
    return streamJsonpToHttpResponse(objectStream, options.formatParams.callback, res, done);
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
  if(format === 'csv') {
    // TODO autocomplete CSV responses?
    return sendInternalServerError(res, "CSV for autocomplete not supported");
  }
  var objectStream = dbapi.transformToObjects(stream, spec, 'autocomplete');
  if(format === 'jsonp') {
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
    dbapi.transformToObjects(rowStream, spec, 'csv'),
    csvTransformer
  );
  streamToHttpResponse(csvStream, res, {}, cb);

}


/******************************************************************************/
/*** Address Autocomplete *****************************************************/
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

    var params = {
      specified: specifiedParams,
      autocomplete: autocompleteParams
    };

    applyDefaultPagingForAutocomplete(pagingParams);

    // Getting the data
    withPsqlClient(res, function(client, done) {
      dbapi.streamingQuery(client, spec,  params, toOffsetLimit(pagingParams), function(err, stream) {
        if(err) {
          done();
          sendInternalServerError(res, "Failed to execute query");
          throw err;
        }
        streamAutocompleteResponse(stream, res, spec, {
          formatParams: formatParams
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
      console.log("Failed to obtain postgresql connection", err);
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
function JsonStringifyStream(replacer, space) {
  Transform.call(this, {
    objectMode: true
  });
  this.replacer = replacer;
  this.space = space;
  this.headerWritten = false;
}

JsonStringifyStream.prototype._flush = function(cb) {
  if(!this.headerWritten) {
    this.push('[\n');
  }
  this.push('\n]');
  cb();
};

JsonStringifyStream.prototype._transform = function(chunk, encoding, cb) {
  var json = JSON.stringify(chunk, this.replacer, this.space);
  if(!this.headerWritten) {
    this.headerWritten = true;
    this.push('[\n');
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

function streamJsonpToHttpResponse(stream, callbackName, res, done) {
  setJsonpContentHeader(res);
  res.write(callbackName + "(");
  streamToHttpResponse(transformJsonToText(stream), res, { end: false }, function(err) {
    if(err) {
      return done(err);
    }
    res.end(");");
    done();
  });

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
  res.send(code, jsonStringifyPretty(message));
}
