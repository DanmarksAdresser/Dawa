"use strict";

var eventStream = require('event-stream');
var winston = require('winston');
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
  sendError(res, 400, {type: "ResourceKeyFormatError",
    title: "The URI path was ill-formed.",
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
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.end(jsonStringifyPretty(message));
}

function withReadonlyTransaction(res, callback) {
  return dbapi.withReadonlyTransaction(function(err, client, done) {
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


function baseUrl(req) {
  var protocol = req.connection.encrypted ? 'https' : 'http';
  return protocol + '://' + req.headers.host;
}

exports.createExpressHandler = function(resourceSpec) {
  var spec = resourceSpec;
  return function(req, res) {
    /*
     * Parse and validate the parameters
     */
    var pathParameterParseResult = parseParameters(spec.pathParameters, req.params);
    if(pathParameterParseResult.errors.length > 0) {
      return sendUriPathFormatError(res, pathParameterParseResult.errors);
    }
    var parameterParseResult = parseParameters(spec.queryParameters, req.query);
    if (parameterParseResult.errors.length > 0){
      return sendQueryParameterFormatError(res, parameterParseResult.errors);
    }

    var params = _.extend({}, parameterParseResult.params, pathParameterParseResult.params);
    params.format = params.format || 'json';

    // each actual resource impl may need some additional processing of the parameters
    // before they are passed on to the SQL layer
    spec.processParameters(params);
    var formatParam = params.format;

    // choose the right representation based on the format requested by client
    var representation = spec.chooseRepresentation(formatParam, spec.representations);
    if(_.isUndefined(representation) || _.isNull(representation)){
      return sendQueryParameterFormatError(res,
        'Det valgte format ' + formatParam + ' er ikke understøttet for denne ressource');
    }

    // build the query
    var sqlParts = spec.sqlModel.createQuery(_.pluck(representation.fields, 'name'), params);

    // create a mapper function that maps results from the SQL layer to the requested representation
    var mapObject = representation.mapper(baseUrl(req), params);
    withReadonlyTransaction(res, function(client, done) {
      if(spec.singleResult) {
        // create a function that can write the object to the HTTP response based on the format requrested by the
        // client
        var serializeSingleResult = serializers.createSingleObjectSerializer(formatParam, params.callback, representation.fields);
        dbapi.query(client, sqlParts, function(err, rows) {
          done(err);
          if (err) {
            return sendPostgresQueryError(res, err);
          } else if (rows.length > 1) {
            sendInternalServerError(res, "UUID: "+req.params.id+", results in more than one address: "+rows);
          } else if (rows.length === 0) {
            sendAddressNotFoundError(res, "UUID: "+req.params.id+", match no address");
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
          representation.fields);
        dbapi.stream(client, sqlParts, function(err, stream) {
          if(err) {
            winston.error("Error executing cursor query: %j", err, {});
            done(err);
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
