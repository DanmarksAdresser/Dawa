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
    if(spec.parameterGroups.reverseGeocoding) {
      publishReverseGeocoding(app, spec);
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
    memo[groupName].errors = parseResult.errors;
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
    var parameterGroups = apiSpecUtil.getParameterGroupsForSpec(spec, ['propertyFilter', 'format', 'crs'], apiSpec.formatParameterSpec, apiSpec.pagingParameterSpec);
    var rawParams = {};
    _.extend(rawParams, req.query, req.params);
    var parameterParseResult = parseParameters(parameterGroups, rawParams);
    if (parameterParseResult.propertyFilter.errors.length > 0){
      var keyValues = _.reduce(keyArray, function(memo, key) {
        memo.push(req.params[key]);
        return memo;
      }, []);
      return sendResourceKeyFormatError(res, "The resource-key is ill-formed: " + keyValues.join(', ') + ". "+parameterParseResult.propertyFilter.errors[0][1]);
    }
    if(parameterParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }



    var sqlParts = apiSpecUtil.createSqlParts(spec, parameterGroups, parameterParseResult.params);

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
            formatParams: parameterParseResult.format,
            baseUrl: baseUrl(req),
            srid: parameterParseResult.params.srid || 4326
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


function publishReverseGeocoding(app, spec) {
  app.get('/'+ spec.model.plural+'/reverse', function (req, res) {
    var parameterGroups = apiSpecUtil.getParameterGroupsForSpec(
      spec,
      ['format', 'crs', 'reverseGeocoding'],
      apiSpec.formatParameterSpec, apiSpec.pagingParameterSpec
    );

    var parameterParseResult = parseParameters(parameterGroups, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    // Getting the data
    withPsqlClient(res, function (client, done) {
      dbapi.query(client, apiSpecUtil.createSqlParts(spec, parameterGroups, parameterParseResult.params), function(err, rows) {
        done();
        if (err) {
          sendInternalServerError(res, err);
        } else if (rows.length === 1) {
          sendSingleResultToHttpResponse(rows[0], res, spec, {
            formatParams: parameterParseResult.params,
            baseUrl: baseUrl(req)
          });
        } else {
          sendInternalServerError(res, "Reverse geocoding results in more than one address: "+rows);
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
        streamRowsHttpResponse(stream, res, spec, {
          formatParams: parameterParseResult.format,
          baseUrl: baseUrl(req),
          srid: parameterParseResult.srid || 4326
        }, done);
      });
    });
  });
}

function sendSingleResultToHttpResponse(result, res, spec, options) {
  var format = options.formatParams.format || 'json';
  var callback = options.formatParams.callback;
  setAppropriateContentHeader(res, format, callback);
  if(format === 'csv') {
    return streamCsvToHttpResponse(eventStream.readArray([result]), spec, res, function() {});
  }
  var textObject = jsonStringifyPretty(spec.mappers[format](result, { baseUrl: options.baseUrl, srid: options.srid }));
  if(callback) {
    var sep = jsonpSep(callback, {open: '', separator: '', close: ''});
    res.write(sep.open);
    res.write(textObject);
    res.end(sep.close);
  }
  else {
    res.end(textObject);
  }
}

function toGeoJsonUrn(srid) {
  return 'EPSG:' + srid;
}

function computeSeparator(format, options, callbackName) {
  var sep = format === 'geojson' ? geojsonFeatureSep(toGeoJsonUrn(options.srid)) : jsonSep;
  if (callbackName) {
    sep = jsonpSep(callbackName, sep);
  }
  return sep;
}
function transformToText(objectStream, format, callbackName, options) {
  var sep = computeSeparator(format, options, callbackName);
  return eventStream.pipeline(
    objectStream,
    new JsonStringifyStream(undefined, 2, sep)
  );
}

/**
 * Compute the appropriate Content-Type header based on the format and
 */
function contentHeader(format, jsonpCallbackName) {
  if(format == 'csv') {
    return 'text/csv; charset=UTF-8';
  }
  else if (jsonpCallbackName) {
    return "application/javascript; charset=UTF-8";
  }
  else {
    return 'application/json; charset=UTF-8';
  }
}

function setAppropriateContentHeader(res, format, callback) {
  res.setHeader('Content-Type', contentHeader(format, callback));
}
/**
 * Sends a stream DB query rows to the http response in the appropriate format
 * @param stream a stream of database rows
 * @param res http response
 * @param spec the api spec
 * @param options must contain formatParams
 * @param done called upon completion
 */
function streamRowsHttpResponse(stream, res, spec, options, done) {
  var format = options.formatParams.format || 'json';
  var callback = options.formatParams.callback;
  setAppropriateContentHeader(res, format, callback);
  if(format === 'csv') {
    return streamCsvToHttpResponse(stream, spec, res, done);
  }
  var objectStream = dbapi.transformToObjects(stream, spec, format, { baseUrl: options.baseUrl });
  var textStream = transformToText(objectStream, format, callback, options);
  streamToHttpResponse(textStream, res, {}, done);
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
  var textStream = transformToText(objectStream, 'json', options.formatParams.callback, {});
  setAppropriateContentHeader(res, format, callback);
  streamToHttpResponse(textStream, res, {}, done);
}

/**
 * When autocompleting, if per_side is not specified, it defaults to 20.
 */
function applyDefaultPagingForAutocomplete(pagingParams) {
  if(!pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
}

function streamCsvToHttpResponse(rowStream, spec, res, cb) {
  var fields = spec.fields;
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

function jsonStringifyPretty(object){
  return JSON.stringify(object, undefined, 2);
}

util.inherits(JsonStringifyStream, Transform);
function JsonStringifyStream(replacer, space, sep) {
  Transform.call(this, {
    objectMode: true
  });
  this.replacer = replacer;
  this.space = space;
  this.headerWritten = false;
  this.sep = sep ? sep : { open: '[\n', separator: ',\n', close: '\n]'};
}

JsonStringifyStream.prototype._flush = function(cb) {
  if(!this.headerWritten) {
    this.push(this.sep.open);
  }
  this.push(this.sep.close);
  cb();
};

JsonStringifyStream.prototype._transform = function(chunk, encoding, cb) {
  var json = JSON.stringify(chunk, this.replacer, this.space);
  if(!this.headerWritten) {
    this.headerWritten = true;
    this.push(this.sep.open);
  }
  else {
    this.push(this.sep.separator);
  }
  this.push(json);
  cb();
};

var jsonSep = {
  open: '[\n',
  separator: ', ',
  close: '\n]'
};

function geojsonFeatureSep(crsUri) {
  return {
    open: '{\n' +
      '"type": "FeatureCollection",\n' +
      '"crs": {' +
      '\n"type": "name",' +
      '\n"properties": {"name": "' + crsUri + '"}\n}\n,"features":[',
    separator: ', ',
    close: ']\n}'
  };
}

function jsonpSep(callbackName, sep) {
  return {
    open: callbackName +'(' + sep.open,
    separator: jsonSep.separator,
    close: sep.close + ');'
  };
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
