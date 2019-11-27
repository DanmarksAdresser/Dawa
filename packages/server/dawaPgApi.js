"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');
var methodOverride = require('method-override');
var bodyParser = require('body-parser');
const conf = require('@dawadk/common/src/config/holder').getConfig();

var resourceImpl = require('./apiSpecification/common/resourceImpl');

var registry = require('./apiSpecification/registry');
require('./apiSpecification/allSpecs');
require('./apiSpecification/replikering/events/resources');
const {oisMiddleWare } = require('./middleware/ois');



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

  const replicationEnabled = conf.get("replication.enabled");
  if(!replicationEnabled) {
    app.use((req, res, next) => {
      if ((req.path.toLowerCase().indexOf('/replikering/') !== -1)) {
        return res.status(500).send("Replikerings-API'et er deaktiveret.");
      }
      next();
    });
  }
  app.use(oisMiddleWare());

  registry.where({
    type: 'resource'
  }).forEach(function (resource) {
    if (!resource.path.startsWith('/bbr/') || conf.get('grbbr.enabled')) {
      const responseHandler = resourceImpl.resourceResponseHandler(resource);
      app.get(resource.path, resourceImpl.createExpressHandler(responseHandler));
    }
  });

  registry.where({
    type: 'resourceImpl'
  }).forEach(function(resourceImpl) {
    app.get(resourceImpl.path, resourceImpl.expressHandler);
  });

  registry.where({
    type: 'httpHandler'
  }).forEach(function(httpHandler) {
    app.get(httpHandler.path, resourceImpl.createExpressHandler(httpHandler.responseHandler));
  });

  registry.where({
    type: 'expressHandler'
  }).forEach(({path, handler}) => app.get(path, handler));
  return app;
};

