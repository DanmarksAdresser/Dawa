"use strict";

var paths = require('../paths');
var sqlUtil = require('./sql/sqlUtil');
var logger = require('../../logger');
var _ = require('underscore');

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
  serialize,
  callback,
  releaseDbClient) {
  // create a function that can write the object to the HTTP response based on the format requrested by the
  // client
  resourceSpec.sqlModel.query(dbClient, fieldNames, validatedParams, function(err, rows) {
    releaseDbClient(err);
    if (err) {
      return callback(null, modelErrorResponse(err));
    } else if (rows.length > 1) {
      return callback(null, internalServerErrorResponse("The request resulted in more than one response"));
    } else if (rows.length === 0) {
      return callback(null, objectNotFoundResponse(validatedPathParams));
    } else {
      // map the object and send it to the client
      var mappedResult = mapObject(rows[0]);
      return serialize(mappedResult, callback);
    }
  });
}

function arrayResultResponse(resourceSpec, dbClient, params, fieldNames, mapObject, serialize, callback, releaseDbClient) {
  resourceSpec.sqlModel.stream(dbClient, fieldNames, params, function(err, stream) {
    if(err) {
      releaseDbClient(err);
      return callback(null, modelErrorResponse(err));
    }

    // map the query results to the correct representation and serialize to http response
    var pipe = pipeline(stream);
    pipe.map(mapObject);
    pipe.completed().then(function() {
      releaseDbClient();
    }, function(err) {
      releaseDbClient(err);
    });
    serialize(pipe, callback);
  });

}

function resourceResponse(withDatabaseClient, resourceSpec, req, shouldAbort, callback) {
  var parseResult = parseAndProcessParameters(resourceSpec, req.params, req.query);
  if(parseResult.pathErrors) {
    return callback(null, uriPathFormatErrorResponse(parseResult.pathErrors));
  }
  else if(parseResult.queryErrors) {
    return callback(null, queryParameterFormatErrorResponse(parseResult.queryErrors));
  }
  var params = parseResult.processedParams;

  var formatParam = params.format;

  // choose the right representation based on the format requested by client
  var representation = resourceSpec.chooseRepresentation(formatParam, resourceSpec.representations);
  if(_.isUndefined(representation) || _.isNull(representation)){
    return callback(null, queryParameterFormatErrorResponse('Det valgte format ' + formatParam + ' er ikke understøttet for denne ressource'));
  }
  logger.debug('ParameterParsing', 'Successfully parsed parameters', {parseResult: params});
  // The list of fields we want to retrieve from database
  var fieldNames = _.pluck(_.filter(representation.fields, function(field){ return field.selectable; }), 'name');

  // create a mapper function that maps results from the SQL layer to the requested representation
  var mapObject = representation.mapper(paths.baseUrl(req), params, resourceSpec.singleResult);

  withDatabaseClient(function(err, dbClient, releaseDbClient) {
    if(err) {
      return internalServerErrorResponse(err);
    }
    // we do not want to produce a response if it is no longer needed
    if(shouldAbort()) {
      return releaseDbClient();
    }
    if(resourceSpec.singleResult) {
      // create a serializer function that can stream the objects to the HTTP response in the format requrested by the
      // client
      var serializeSingleResult = serializers.createSingleObjectSerializer(formatParam,
        params.callback,
        params.noformat === undefined,
        representation);
      return singleResultResponse(resourceSpec, dbClient,parseResult.pathParams, params, fieldNames, mapObject, serializeSingleResult, callback, releaseDbClient);
    }
    else {
      // create a serializer function that can stream the objects to the HTTP response in the format requested by the
      // client
      var serializeStream = serializers.createStreamSerializer(formatParam,
        params.callback,
        params.srid,
        params.noformat === undefined,
        representation);
      return arrayResultResponse(resourceSpec, dbClient, params, fieldNames, mapObject, serializeStream, callback, releaseDbClient);
    }
  });
}

exports.resourceResponse = resourceResponse;

exports.createExpressHandler = function(resourceSpec) {
  return function(req, res) {
    // In case the HTTP connection has been reset before we get a psql connection,
    // we do not want to actually acquire it.
    function shouldAbort() {
      return !res.connection.writable;
    }
    function withDbClient(callback) {
      transactions.beginTransaction('prod', {mode: 'READ_ONLY', pooled: true, shouldAbort: shouldAbort}).then(
        function(tx) {
          callback(undefined, tx.client, function(err) {
            transactions.endTransaction(tx, err);
          });
        },
        function(err) {
          if(shouldAbort()) {
            // normal cancellation of transaction - callback never called.
            logger.info("http", "Client closed connection before database transaction was started", err);
          }
          else {
            callback(err);
          }
        }
      );
    }

    resourceResponse(withDbClient, resourceSpec, req, shouldAbort, function(err, response) {
      if(shouldAbort()) {
        return;
      }
      if(err) {
        response = internalServerErrorResponse(err);
      }
      res.statusCode = response.status || 200;
      _.each(response.headers, function(headerValue, headerName) {
        res.setHeader(headerName, headerValue);
      });
      if(response.body) {
        res.end(response.body);
      }
      else if(response.bodyPipe) {
        response.bodyPipe.toHttpResponse(res);
      }
      else {
        res.end();
      }
    });
  };
};
