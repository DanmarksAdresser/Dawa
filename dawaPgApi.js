"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');

var logger = require('./logger');
var resourceImpl = require('./apiSpecification/common/resourceImpl');

var registry = require('./apiSpecification/registry');
var url = require('url');
require('./apiSpecification/allSpecs');
require('./apiSpecification/replikering/events/resources');

var dayInSeconds = 24 * 60 * 60;
var cacheMaxAge = process.env.cacheMaxAge || dayInSeconds;

function cachingMiddleware(req, res, next) {
  // this looks like a mess, but we cannot set the caching headers before we
  // know the response code
  var baseFunc = res.writeHead;
  res.writeHead = function(statusCode, reasonPhrase, headers) {
    var header;
    if(statusCode >= 300 || req.query.cache === 'no-cache' || req.path.indexOf('/replikering') === 0) {
      header = 'no-cache';
    }
    else {
      header = 's-maxage=' + cacheMaxAge;
    }
    res.setHeader('Cache-Control', header);
    if(headers) {
      headers['Cache-Control'] = header;
    }
    if(!headers && reasonPhrase) {
      reasonPhrase['Cache-Control'] = header;
    }
    baseFunc.call(res, statusCode, reasonPhrase, headers);
  };
  next();
}

//noinspection JSUnusedLocalSymbols
function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}

function requestLoggingMiddleware(req, res, next) {
  var startTime = new Date();
  var streamingStarted;

  // we want to log when we start delivering data to the client
  // this hack was the best I could do, because responses does not emit any
  // useful events when data is streamed to the response.
  res.once('pipe', function(src) {
    // setImmediate is apparently required, for reasons not understood.
    setImmediate(function() {
      src.once('data', function() {
        streamingStarted = new Date();
      });
      var cumulatedDataLength = 0;
      var loggedDataLength = 0;
      src.on('data', function(data) {
        cumulatedDataLength += data.length;
        if(cumulatedDataLength > loggedDataLength + 1000000) {
          logger.info('requestDebug', {
            dataLength: data.length,
            cumulatedDataLength: cumulatedDataLength,
            socketBytesWritten: res.socket.bytesWritten,
            socketBytesRead: res.socket.bytesRead,
            connectionWritable: res.connection.writable
          });
          loggedDataLength = cumulatedDataLength;
        }
      });
    });
  });
  function logRequest(closedPrematurely) {
    var meta = {};
    meta.requestReceived = startTime.toISOString();
    if(streamingStarted) {
      meta.responseBegin = streamingStarted.toISOString();
    }
    meta.responseEnd = new Date().toISOString();
    if(req.headers['x-forwarded-for']) {
      meta['X-forwarded-for']=req.headers['x-forwarded-for'];
    }
    meta.method = req.method;
    meta.url = req.url;
    meta.path = url.parse(req.url).pathname;
    meta.httpVersion = req.httpVersion;
    meta.statusCode = res.statusCode;
    meta.Host = req.headers.host;
    meta.protocol = req.connection.encrypted ? 'https' : 'http';
    if(req.headers.via) {
      meta.Via = req.headers.via;
    }
    meta.closedPrematurely = closedPrematurely;
    if(req.headers.referer) {
      meta.referer = req.headers.referer;
    }
    var level = closedPrematurely ? 'warn' : 'info';
    logger.log(level, 'requests', 'Processed request', meta);
  }

  res.once('close', function() {logRequest(true); });
  res.once('finish', function() {logRequest(false); });
  next();
}

/******************************************************************************/
/*** Routes *******************************************************************/
/******************************************************************************/

exports.setupRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(methodOverride());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(requestLoggingMiddleware);
  app.use(corsMiddleware);
  app.use(cachingMiddleware);

  registry.where({
    type: 'resource'
  }).forEach(function (resource) {
      app.get(resource.path, resourceImpl.createExpressHandler(resource));
    });

  registry.where({
    type: 'resourceImpl'
  }).forEach(function(resourceImpl) {
    app.get(resourceImpl.path, resourceImpl.expressHandler);
  });

  return app;
};

