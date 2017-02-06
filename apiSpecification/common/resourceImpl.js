"use strict";

var _ = require('underscore');

var logger = require('../../logger');
const paths = require('../paths');

var parameterParsing = require('../../parameterParsing');
const databasePools = require('../../psql/databasePools');
var serializers = require('./serializers');
const { comp, map } = require('transducers-js');
const { Channel, Signal, Abort, OperationType, CLOSED, go, parallel } = require('ts-csp');
const dbLogger = require('../../logger').forCategory('Database');
const requestLogger = require('../../logger').forCategory('RequestLog');
const statistics = require('../../statistics');
const sqlUtil = require('./sql/sqlUtil');

const { pipeToStream, pipe } = require('../../util/cspUtil');

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

const getClientIp = req => {
  const xForwardedFor = req.header('x-forwarded-for');
  if(xForwardedFor) {
    const firstCommaIndex = xForwardedFor.indexOf(',');
    return firstCommaIndex !== -1 ? xForwardedFor.substring(0, firstCommaIndex) : xForwardedFor;
  }
  else {
    return req.ip;
  }
};

const getRequestId = req => {
  return req.header('X-Amz-Cf-Id');
};

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

const prepareResponse = (client, resourceSpec, baseUrl, pathParams, queryParams) => {
  return go(function*() {
    const parseResult = parseAndProcessParameters(resourceSpec, pathParams, queryParams);
    if(parseResult.pathErrors) {
      return uriPathFormatErrorResponse(parseResult.pathErrors);
    }
    else if(parseResult.queryErrors) {
      return queryParameterFormatErrorResponse(parseResult.queryErrors);
    }
    const params = parseResult.processedParams;

    const formatParam = params.format;

    const strukturParam = params.struktur;

    // choose the right representation based on the format requested by client
    const representation = resourceSpec.chooseRepresentation(formatParam, strukturParam, resourceSpec.representations);
    if(_.isUndefined(representation) || _.isNull(representation)){
      return queryParameterFormatErrorResponse('Det valgte format ' + formatParam + ' er ikke understøttet for denne ressource');
    }
    logger.debug('ParameterParsing', 'Successfully parsed parameters', {parseResult: params});
    // The list of fields we want to retrieve from database
    const fieldNames = _.pluck(_.filter(representation.fields, function(field){ return field.selectable; }), 'name');

    if(resourceSpec.sqlModel.validateParams) {
      try {
        yield resourceSpec.sqlModel.validateParams(client, params);
      }
      catch(err) {
        return modelErrorResponse(err);
      }
    }

    // create a mapper function that maps results from the SQL layer to the requested representation
    const mapObject = representation.mapper(baseUrl, params, resourceSpec.singleResult);
    const transducingSerializer = serializers.transducingSerializer(
      resourceSpec.singleResult,
      formatParam,
      params.callback,
      params.srid,
      !(params.noformat || params.ndjson),
      params.ndjson,
      representation);

    const xform = comp(map(mapObject), transducingSerializer.xform);
    let execute;
    if(resourceSpec.singleResult) {
      const rows = yield this.delegateAbort(resourceSpec.sqlModel.processQuery(client, fieldNames, params));
      if(rows.length === 0) {
        return objectNotFoundResponse(pathParams);
      }
      else if (rows.length > 1) {
        return internalServerErrorResponse("Unexpected number of results from query");
      }
      const value = rows[0];
      execute = (client, channel) => go(function*() {
        yield channel.put(value);
        channel.close();
      });
    }
    else if (resourceSpec.disableStreaming) {
      execute = (client, channel) => go(function*() {
        this.abortSignal.take().then(() => 'EXECUTE ABORTED');
        const result = yield this.delegateAbort(resourceSpec.sqlModel.processQuery(client, fieldNames, params));
        yield channel.putMany(result);
        channel.close();
      });
    }
    else {
      execute = (client, channel) =>
        client.withTransaction(
          'READ_ONLY',
          () => resourceSpec.sqlModel.processStream(client, fieldNames, params, channel));
    }

    return {
      status: transducingSerializer.status,
      headers: transducingSerializer.headers,
      execute,
      xform
    };
  });
};

exports.prepareResponse = prepareResponse;

function serveResponse(client, req, res, response, initialDataSignal) {
  return go(function*() {
    res.statusCode = response.status || 200;
    _.each(response.headers, function (headerValue, headerName) {
      res.setHeader(headerName, headerValue);
    });

    if(response.body) {
      res.end(response.body);
      return;
    }


    // Channel for data written to HTTP response
    const httpResponseChannel = new Channel(0, response.xform);

    // channel used for buffering query responses
    const bufferChannel = new Channel(400);

    // process which pipes response data to the NodeJS response stream
    const httpWriterProcess  =  pipeToStream(httpResponseChannel, res, 200, initialDataSignal);

    // process responsible for querying the database and puting the rows to bufferChannel
    const queryProcess = response.execute(client, bufferChannel);

    // Process which pipes rows from the bufferChannel to the httpResponseChannel
    const pipeProcess = pipe(bufferChannel, httpResponseChannel, 200);

    // Compose the three child processes into one
    const responseProcess = parallel(httpWriterProcess, queryProcess, pipeProcess);

    // wait for the responseProcess to complete (or abort)
    return yield this.delegateAbort(responseProcess);
  });
}


const pipeToArray = (src, batchSize) => go(function*() {
  const result = [];
  /* eslint no-constant-condition: 0 */
  while (true) {
    const {values} = yield this.selectOrAbort(
      [{ch: src, op: OperationType.TAKE_MANY, count: batchSize}]);
    const closed = values[values.length - 1] === CLOSED;
    if (closed) {
      values.pop();
    }
    for(let value of values) {
      result.push(value);
    }
    if (closed) {
      return result;
    }
  }
});

const materializeBody = (client, preparedResponse) => go(function*() {
  if(typeof preparedResponse.body !== 'undefined') {
    return preparedResponse.body;
  }
  const ch = new Channel(0, preparedResponse.xform);

  const queryProcess = preparedResponse.execute(client, ch);
  const arrayWriterProcess = pipeToArray(ch, 200);
  const [result] = yield this.delegateAbort(parallel(arrayWriterProcess, queryProcess));
  return result.join('');
});

exports.materializeResponse = (client, resourceSpec, baseUrl, pathParams, queryParams) => go(function*() {
  const preparedResponse = yield this.delegateAbort(prepareResponse(client, resourceSpec, baseUrl, pathParams, queryParams));
  const body = yield materializeBody(client, preparedResponse);

  return {
    status: preparedResponse.status,
    headers: preparedResponse.headers,
    body
  }
});

exports.createExpressHandler = function(resourceSpec) {
  return function(req, res) {
    go(function*() {
      const requestContext = {
        requestReceived: Date.now(),
        waitTime: 0,
        queryTime: 0,
        clientIp: getClientIp(req),
        path: req.path,
      };
      const requestId = getRequestId(req);
      if(requestId) {
        requestContext.requestId = requestId;
      }
      // Create a signal which is raised when the client aborts the HTTP connection
      const clientDisconnectedSignal = new Signal();
      req.once('aborted', err => clientDisconnectedSignal.raise("Client closed connection"));

      const baseUrl = paths.baseUrl(req);

      const dbStatContext = { clientIp: requestContext.clientIp};
      if(requestContext.requestId) {
        dbStatContext.requestId = requestContext.requestId;
      }
      const dbLogListener = logMessage => {
        if(logMessage.error) {
          dbLogger.error('Query Failed', logMessage);
        }
        requestContext.waitTime += logMessage.waitTime;
        requestContext.queryTime += logMessage.queryTime;
        statistics.emit('psql_query', logMessage.queryTime, null, dbStatContext);
      };

      const initialDataSignal = new Signal();
      initialDataSignal.take().then(value => requestContext.responseBegin = Date.now());
      const clientOptions = {
        clientId: requestContext.clientIp,
        logger: dbLogListener
      };
      const process = databasePools.get('prod').withConnection(clientOptions, (client) => {
        return go(function*() {
          const preparedResponse = yield this.delegateAbort(prepareResponse(client, resourceSpec, baseUrl, req.params, req.query));
          return yield this.delegateAbort(serveResponse(client, req, res, preparedResponse, initialDataSignal));
        });
      });
      clientDisconnectedSignal.connect(process.abort);
      try {
        yield process;
      }
      catch (err) {
        requestContext.error = err;
        req.destroy();
      }
      requestContext.responseEnd = Date.now();
      const requestOutcome = requestContext.err ?
        (requestContext.err instanceof Abort ? 'ABORTED' : 'FAILED') :
        'COMPLETED';
      requestContext.outcome = requestOutcome;
      const logLevels = {
        ABORTED: 'warn',
        FAILED: 'error',
        COMPLETED: 'info'
      };
      if(requestContext.responseBegin) {
        requestContext.initialDelay = requestContext.responseBegin - requestContext.requestReceived;
      }
      requestLogger[logLevels[requestOutcome]]("Request Completed", requestContext);
    }).asPromise().catch((err) => {
      requestLogger.error('Unexpected internal coding error', err);
      req.destroy();
    });
  };
};
