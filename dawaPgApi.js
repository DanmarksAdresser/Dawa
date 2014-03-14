"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express          = require('express');
var _                = require('underscore');

var vejnavnResources = require('./apiSpecification/vejnavn/resources');
var vejstykkeResources = require('./apiSpecification/vejstykke/resources');
var supplerendebynavnResources = require('./apiSpecification/supplerendebynavn/resources');
var postnummerResources = require('./apiSpecification/postnummer/resources');
var adgangsadresseResources = require('./apiSpecification/adgangsadresse/resources');
var adresseResources = require('./apiSpecification/adresse/resources');
var dagitemaResources = require('./apiSpecification/dagitemaer/resources');

var resourceImpl = require('./apiSpecification/common/resourceImpl');

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


  vejnavnResources.concat(vejstykkeResources).concat(supplerendebynavnResources).concat(postnummerResources).concat(adgangsadresseResources).concat(adresseResources).forEach(function(resourceSpec) {
    app.get(resourceSpec.path, resourceImpl.createExpressHandler(resourceSpec));
  });

  _.each(dagitemaResources, function(resources) {
    resources.forEach(function(resourceSpec) {
      app.get(resourceSpec.path, resourceImpl.createExpressHandler(resourceSpec));
    });
  });

  return app;
};

