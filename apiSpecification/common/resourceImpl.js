"use strict";

var paths = require('../paths');
var eventStream = require('event-stream');
var logger = require('../../logger');
var _ = require('underscore');

var dbapi = require('../../dbapi');
var parameterParsing = require('../../parameterParsing');
var serializers = require('./serializers');

function jsonStringifyPretty(object){
  return JSON.stringify(object, undefined, 2);
}

/**
 * Parses multiple groups of parameters.
 * @param parameterGroups a hash where values are lists of parameter specifications
 * @param rawParams the query parameters
 * @returns a hash where the values are the parsed parameters, plus an additional errors key that contains
 * an array of parsing errors.
 */
function parseParameters(parameterSpec, rawParams) {
    return parameterParsing.parseParameters(rawParams, _.indexBy(parameterSpec, 'name'));
}

function sendQueryParameterFormatError(res, details){
  sendError(res, 400, {type: "QueryParameterFormatError",
    title: "One or more query parameters was ill-formed.",
    details: details});
}

function sendUriPathFormatError(res, details){
  sendError(res, 400, {type: "ResourcePathFormatError",
    title: "The URI path was ill-formed.",
    details: details});
}

function sendPostgresQueryError(res, details) {
  var msg = {type: "InvalidRequestError",
    title: "The request resulted in an invalid database query, probably due to bad query parameters",
    details: details.hint};
  sendError(res, 400, msg);
}

function sendObjectNotFoundError(res, details){
  sendError(res, 404, {type: "ResourceNotFoundError",
    title: "The resource was not found",
    details: details});
}

function sendInternalServerError(res, details){
  var msg = {type: "InternalServerError",
    title: "Something unexpected happened inside the server.",
    details: details};
  logger.error('http', "Internal server error: %j", {});
  sendError(res, 500, msg);
}

function sendError(res, code, message){
  res.statusCode = code;
//  winston.debug("Sending error message %j", message, {});
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.end(jsonStringifyPretty(message));
}

function withReadonlyTransaction(res, callback) {
  return dbapi.withReadonlyTransaction(function(err, client, done) {
    if (err) {
      // We do not have a connection to PostgreSQL.
      // Abort!
      sendInternalServerError(res, err);
      return;
    }
    return callback(client, done);
  });
}

function parseAndProcessParameters(resourceSpec, pathParams, queryParams) {
  /*
   * Parse and validate the parameters
   */
  var pathParameterParseResult = parseParameters(resourceSpec.pathParameters, pathParams);
  if(pathParameterParseResult.errors.length > 0) {
    return {
      pathErrors: pathParameterParseResult.errors
    };
  }
  var parameterParseResult = parseParameters(resourceSpec.queryParameters, queryParams);
  if (parameterParseResult.errors.length > 0){
    return {
      queryErrors: parameterParseResult.errors
    };
  }

  var params = _.extend({}, parameterParseResult.params, pathParameterParseResult.params);
  params.format = params.format || 'json';

  // each actual resource impl may need some additional processing of the parameters
  // before they are passed on to the SQL layer
  resourceSpec.processParameters(params);
  return {
    pathParams: pathParameterParseResult.params,
    queryParams: parameterParseResult.params,
    processedParams: params
  };
}

exports.internal = {
  parseAndProcessParameters: parseAndProcessParameters
};

function logPostgresQueryError(req, query, err) {
  logger.error('sql', 'query failed', {url: req.url, sql: query.sql, params: query.params, error: err});
}

exports.createExpressHandler = function(resourceSpec) {
  var spec = resourceSpec;
  return function(req, res) {
    var parseResult = parseAndProcessParameters(resourceSpec, req.params, req.query);
    if(parseResult.pathErrors) {
      return sendUriPathFormatError(res, parseResult.pathErrors);
    }
    else if(parseResult.queryErrors) {
      return sendQueryParameterFormatError(res, parseResult.queryErrors);
    }
    var params = parseResult.processedParams;

    var formatParam = params.format;

    // choose the right representation based on the format requested by client
    var representation = spec.chooseRepresentation(formatParam, spec.representations);
    if(_.isUndefined(representation) || _.isNull(representation)){
      return sendQueryParameterFormatError(res,
        'Det valgte format ' + formatParam + ' er ikke understøttet for denne ressource');
    }
    logger.debug('ParameterParsing', 'Successfully parsed parameters', {parseResult: params});
    // build the query
    var query = spec.sqlModel.createQuery(_.pluck(representation.fields, 'name'), params);

    // create a mapper function that maps results from the SQL layer to the requested representation
    var mapObject = representation.mapper(paths.baseUrl(req), params, spec.singleResult);
    withReadonlyTransaction(res, function(client, done) {
      if(spec.singleResult) {
        // create a function that can write the object to the HTTP response based on the format requrested by the
        // client
        var serializeSingleResult = serializers.createSingleObjectSerializer(formatParam, params.callback, representation);
        dbapi.queryRaw(client, query.sql, query.params, function(err, rows) {
          done(err);
          if (err) {
            logPostgresQueryError(req, query, err);
            return sendPostgresQueryError(res, err);
          } else if (rows.length > 1) {
            sendInternalServerError(res, "The request resulted in more than one response", rows);
          } else if (rows.length === 0) {
            sendObjectNotFoundError(res, parseResult.pathParams);
          } else {
            // map the object and send it to the client
            var mappedResult = mapObject(rows[0]);
            serializeSingleResult(res, mappedResult);
          }
        });
      }
      else {
        // create a serializer function that can stream the objects to the HTTP response in the format requrested by the
        // client
        var serializeStream = serializers.createStreamSerializer(formatParam,
          params.callback,
          params.srid,
          representation);
        dbapi.streamRaw(client, query.sql, query.params, function(err, stream) {
          if(err) {
            done(err);
            logPostgresQueryError(req, query, err);
            return sendPostgresQueryError(res, err);
          }

          // map the query results to the correct representation and serialize to http response
          var mappedStream = eventStream.pipeline(
            stream,
            eventStream.mapSync(mapObject)
          );
          serializeStream(mappedStream, res, done);
        });
      }
    });
  };
};
