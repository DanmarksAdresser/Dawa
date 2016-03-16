"use strict";

var eventStream = require('event-stream');
var q = require('q');
var _ = require('underscore');

var paths = require('../paths');
var sqlUtil = require('./sql/sqlUtil');
var logger = require('../../logger');

var pipeline = require('../../pipeline');
var parameterParsing = require('../../parameterParsing');
var transactions = require('../../psql/transactions');
var serializers = require('./serializers');

function jsonStringifyPretty(object){
  return JSON.stringify(object, undefined, 2);
}

/**
 * Parses multiple groups of parameters.
 * @param parameterSpec a hash where values are lists of parameter specifications
 * @param rawParams the query parameters
 * @returns a hash where the values are the parsed parameters, plus an additional errors key that contains
 * an array of parsing errors.
 */
function parseParameters(parameterSpec, rawParams) {
    return parameterParsing.parseParameters(rawParams, _.indexBy(parameterSpec, 'name'));
}

function validateParameters(parameterSpec, parsedParams) {
  return parameterParsing.validateParameters(parsedParams, _.indexBy(parameterSpec, 'name'));
}

function jsonResponse(status, errorObject) {
  return {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: jsonStringifyPretty(errorObject)
  };
}

function uriPathFormatErrorResponse(details){
  return jsonResponse(404,{type: "ResourcePathFormatError",
    title: "The URI path was ill-formed.",
    details: details});
}

function queryParameterFormatErrorResponse(details) {
  return jsonResponse(400, {type: "QueryParameterFormatError",
    title: "One or more query parameters was ill-formed.",
    details: details});
}

function internalServerErrorResponse(details){
  var msg = {type: "InternalServerError",
    title: "Something unexpected happened inside the server.",
    details: details};
  logger.error('http', "Internal server error", details);
  return jsonResponse(500, msg);
}

function postgresQueryErrorResponse(details) {
  var msg = {type: "InvalidRequestError",
    title: "The request resulted in an invalid database query, probably due to bad query parameters",
    details: details.hint};
  logger.error('http', 'Internal server error running DB query', {code: details.code, message: details.message});
  return jsonResponse(500, msg);
}

function modelErrorResponse(err) {
  if(err instanceof sqlUtil.InvalidParametersError) {
    return queryParameterFormatErrorResponse(err.message);
  }
  else {
    return postgresQueryErrorResponse(err);
  }
}

function objectNotFoundResponse(details){
  return jsonResponse(404, {type: "ResourceNotFoundError",
    title: "The resource was not found",
    details: details});
}

function sendInternalServerError(res, details){
  var msg = {type: "InternalServerError",
    title: "Something unexpected happened inside the server.",
    details: details};
  logger.error('http', "Internal server error", details);
  sendError(res, 500, msg);
}

function sendError(res, code, message){
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.end(jsonStringifyPretty(message));
}

function loggingContext(req) {
  const xForwardedFor = req.header('x-forwarded-for');
  let clientIp;
  if(xForwardedFor) {
    const firstCommaIndex = xForwardedFor.indexOf(',');
    clientIp = firstCommaIndex !== -1 ? xForwardedFor.substring(0, firstCommaIndex) : xForwardedFor;
  }
  else {
    clientIp = req.ip;
  }
  const loggingContext = {
    clientIp: clientIp
  };
  const reqId = req.header('X-Amz-Cf-Id');
  if(reqId) {
    loggingContext.reqId = reqId;
  }
  return loggingContext;
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
  if (params.hasOwnProperty('noformat')) params.noformat = true;
  if (params.hasOwnProperty('ndjson')) params.ndjson = true;

  // each actual resource impl may need some additional processing of the parameters
  // before they are passed on to the SQL layer
  resourceSpec.processParameters(params);

  // we run parameter validation functions after the processing
  var validationErrors = validateParameters(resourceSpec.queryParameters, params);
  if(validationErrors.length > 0) {
    return {
      queryErrors: validationErrors
    };
  }
  return {
    pathParams: pathParameterParseResult.params,
    queryParams: parameterParseResult.params,
    processedParams: params
  };
}

exports.internal = {
  parseAndProcessParameters: parseAndProcessParameters
};

exports.sendInternalServerError = sendInternalServerError;

function singleResultResponse(
  resourceSpec,
  dbClient,
  validatedPathParams,
  validatedParams,
  fieldNames,
  mapObject,
  serialize) {
  // create a function that can write the object to the HTTP response based on the format requrested by the
  // client
  return q.ninvoke(resourceSpec.sqlModel, "query", dbClient, fieldNames, validatedParams).then(function(rows) {
    if (rows.length > 1) {
      logger.error('resourceImpl', 'Query for single object resulted in more than one object', {path: resourceSpec.path, params: validatedParams});
      return internalServerErrorResponse("The request resulted in more than one response");
    } else if (rows.length === 0) {
      return objectNotFoundResponse(validatedPathParams);
    } else {
      // map the object and send it to the client
      var mappedResult = mapObject(rows[0]);
      return q.nfcall(serialize, mappedResult);
    }
  }, function(err) {
    logger.error('resourceImpl', 'Internal error querying for single object', {error: err});
    return modelErrorResponse(err);
  });
}

function arrayResultResponse(resourceSpec, dbClient, params, fieldNames, mapObject, serialize) {
  return q.async(function*() {
    function pipeResult(stream) {
      // map the query results to the correct representation and serialize to http response
      var pipe = pipeline(stream);
      pipe.map(mapObject);
      return q.nfcall(serialize, pipe);
    }

    try {
      if (resourceSpec.disableStreaming) {
        var result = yield q.ninvoke(resourceSpec.sqlModel, "query", dbClient, fieldNames, params);
        let stream = eventStream.readArray(result);
        var serialized = yield pipeResult(stream);
        return serialized;
      }
      else {
        let stream = yield q.ninvoke(resourceSpec.sqlModel, "stream", dbClient, fieldNames, params);
        return yield pipeResult(stream);
      }
    }
    catch(err) {
      logger.error('resourceImpl', 'Caught unexpected error', {error: err});
      return modelErrorResponse(err);
    }
  })();
}

function resourceResponse(client, resourceSpec, req) {
  return q.async(function*() {
    var parseResult = parseAndProcessParameters(resourceSpec, req.params, req.query);
    if(parseResult.pathErrors) {
      return uriPathFormatErrorResponse(parseResult.pathErrors);
    }
    else if(parseResult.queryErrors) {
      return queryParameterFormatErrorResponse(parseResult.queryErrors);
    }
    var params = parseResult.processedParams;

    var formatParam = params.format;

    // choose the right representation based on the format requested by client
    var representation = resourceSpec.chooseRepresentation(formatParam, resourceSpec.representations);
    if(_.isUndefined(representation) || _.isNull(representation)){
      return queryParameterFormatErrorResponse('Det valgte format ' + formatParam + ' er ikke understøttet for denne ressource');
    }
    logger.debug('ParameterParsing', 'Successfully parsed parameters', {parseResult: params});
    // The list of fields we want to retrieve from database
    var fieldNames = _.pluck(_.filter(representation.fields, function(field){ return field.selectable; }), 'name');

    // create a mapper function that maps results from the SQL layer to the requested representation
    var mapObject = representation.mapper(paths.baseUrl(req), params, resourceSpec.singleResult);
    if(resourceSpec.singleResult) {
      // create a serializer function that can stream the objects to the HTTP response in the format requrested by the
      // client
      var serializeSingleResult = serializers.createSingleObjectSerializer(formatParam,
        params.callback,
        !(params.noformat || params.ndjson),
        params.ndjson,
        representation);
      return yield singleResultResponse(resourceSpec, client,parseResult.pathParams, params, fieldNames, mapObject, serializeSingleResult);
    }
    else {
      // create a serializer function that can stream the objects to the HTTP response in the format requested by the
      // client
      var serializeStream = serializers.createStreamSerializer(formatParam,
        params.callback,
        params.srid,
        !(params.noformat || params.ndjson),
        params.ndjson,
        representation);
      var response = yield arrayResultResponse(resourceSpec, client, params, fieldNames, mapObject, serializeStream);
      return response;
    }
  })();
}

exports.resourceResponse = resourceResponse;

exports.createExpressHandler = function(resourceSpec) {
  return function(req, res) {
    // In case the HTTP connection has been reset before we get a psql connection,
    // we do not want to actually acquire it.
    function shouldAbort() {
      return !res.connection.writable;
    }
    function doResponse(client) {
      return resourceResponse(client, resourceSpec, req)
        .catch(function (err) {
          logger.error('resourceImpl', 'An unexpected error happened during resource handling', {error: err});
          return internalServerErrorResponse(err);
        }).then(function (response) {
          res.statusCode = response.status || 200;
          _.each(response.headers, function (headerValue, headerName) {
            res.setHeader(headerName, headerValue);
          });
          if (response.body) {
            res.end(response.body);
          }
          else if (response.bodyPipe) {
            response.bodyPipe.toHttpResponse(res);
            return response.bodyPipe.completed();
          }
          else {
            res.end();
          }
        });
    }
    var promise = transactions.withTransaction('prod', {
      mode: 'READ_ONLY',
      pooled: true,
      shouldAbort: shouldAbort,
      loggingContext: loggingContext(req)
    }, doResponse);

    return promise.catch(function(err) {
      logger.error('resourceImpl', 'Internal error processing request', {error: err});
      res.connection.disconnect();
    });

  };

};
