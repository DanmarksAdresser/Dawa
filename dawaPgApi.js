"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');

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
    if(statusCode >= 300 || req.query.cache === 'no-cache') {
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

function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}

function requestLoggingMiddleware(req, res, next) {
  var startTime = new Date();
  var streamingStarted;
  res.once('pipe', function(src) {
    src.once('data', function() {
      streamingStarted = new Date();
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
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(requestLoggingMiddleware);
  app.use(corsMiddleware);
  app.use(cachingMiddleware);

  registry.where({
    type: 'resource'
  }).forEach(function (resource) {
    console.log('adding resource ' + resource.path);
      app.get(resource.path, resourceImpl.createExpressHandler(resource));
    });

  registry.where({
    type: 'resourceImpl'
  }).forEach(function(resourceImpl) {
    app.get(resourceImpl.path, resourceImpl.expressHandler);
  });

  return app;
};

