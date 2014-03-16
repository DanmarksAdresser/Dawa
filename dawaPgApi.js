"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');

var resourceImpl = require('./apiSpecification/common/resourceImpl');

var registry = require('./apiSpecification/registry');
require('./apiSpecification/allSpecs');

var dayInSeconds = 24 * 60 * 60;
var cacheMaxAge = process.env.cacheMaxAge || dayInSeconds;

function cachingMiddleware(req, res, next) {
  if(req.query.cache === 'no-cache') {
    res.setHeader('Cache-Control', 'no-cache');
  }
  else {
    res.setHeader('Cache-Control',  's-maxage=' + cacheMaxAge);
  }
  next();
}

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
  app.use(cachingMiddleware);

  registry.where({
    type: 'resource'
  }).forEach(function (resource) {
      app.get(resource.path, resourceImpl.createExpressHandler(resource));
    });

  return app;
};

