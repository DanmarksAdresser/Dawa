"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const config = require('./server/config');

var resourceImpl = require('./apiSpecification/common/resourceImpl');

var registry = require('./apiSpecification/registry');
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
      header = 'maxage=' + cacheMaxAge;
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

/**
 * We prevent HEAD requests. Expressjs executes the entire request (resultning in heavy load),
 * which is undesirable. If someone has a great use case for HEAD requests, we can add special
 * support.
 */
function preventHeadMiddleware(req, res, next) {
  if(req.method === 'HEAD') {
    res.sendStatus(405);
  }
  else {
    next();
  }
}

//noinspection JSUnusedLocalSymbols
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
  app.use(methodOverride());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(preventHeadMiddleware);
  app.use(corsMiddleware);
  app.use(cachingMiddleware);
  const oisEnabled = config.getOption('ois.enabled');
  const oisProtected = !config.getOption('ois.unprotected');
  const oisUsers = {};
  oisUsers[config.getOption('ois.login')] = config.getOption('ois.password');

  const oisBasicAuthMiddleware = basicAuth({
    users: oisUsers,
    challenge: true,
    realm: 'OIS login'
  });
  if(!oisEnabled || oisProtected) {
    app.use((req, res, next) => {
      if (req.path.startsWith('/ois')) {
        if(!oisEnabled) {
          return res.status(403).send('OIS currently disabled for all users');
        }
        if(oisProtected) {
          return oisBasicAuthMiddleware(req, res, next);
        }
      }
      next();
    });
  }

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

