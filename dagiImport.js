"use strict";

var request = require('request');
var _ = require('underscore');
var xml2js = require('xml2js');
var dagi = require('./dagi');
var dbapi = require('./dbapi');
var async = require('async');

var dagiUrl = 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2';

var dagiFeatureNames = {
  kommune: 'KOMMUNE10',
  opstillingskreds: 'OPSTILLINGSKREDS10',
  politikreds: 'POLITIKREDS10',
  postdistrikt: 'POSTDISTRIKT10',
  region: 'REGION10',
  retskreds: 'RETSKREDS10',
  sogn: 'SOGN10'
};

function mapGmlCoordinates(str) {
  var coordinateArray = str.split(' ');
  return _.map(coordinateArray, function(c) {
    var coordinates = c.split(',');
    return _.map(coordinates, parseFloat);
  });
}

function extractCoordinates(boundaryIs) {
  return boundaryIs.LinearRing[0].coordinates[0];
}
function mapGmlPolygon(json) {
  var polygon = json.Polygon[0];
  var outerBoundaryIs = polygon.outerBoundaryIs[0];
  var innerBoundaryIsList = polygon.innerBoundaryIs ? polygon.innerBoundaryIs : [];

  var outerCoords = mapGmlCoordinates(extractCoordinates(outerBoundaryIs));
  var innerCoordsList = _.map(_.map(innerBoundaryIsList, extractCoordinates), mapGmlCoordinates);
  return {
    type: 'Polygon',
    coordinates: [outerCoords].concat(innerCoordsList)
  };
}

function removeAll(as, bs) {
  return _.filter(as, function (a) {
    return _.every(bs, function (newTema) {
      return newTema.kode !== a.kode;
    });
  });
}
function putDagiTemaer(temaNavn, temaer, callback) {
  dbapi.withWriteTransaction(function(err, client, done) {
    if(err) throw err;
    dagi.getDagiTemaer(client, temaNavn, function(err, existingTemaer) {
      if(err) throw err;
      var temaerToRemove = removeAll(existingTemaer, temaer);
      var temaerToCreate = removeAll(temaer, existingTemaer);
      var temaerToUpdate = removeAll(temaer, temaerToCreate);
      async.series([
        function(callback) {
          async.eachSeries(temaerToRemove, function(tema, callback) {
            console.log('deleting: ' + JSON.stringify(tema));
            dagi.deleteDagiTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          async.eachSeries(temaerToCreate, function(tema, callback) {
            console.log('adding: ' + JSON.stringify(tema));
            dagi.addDagiTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          async.eachSeries(temaerToUpdate, function(tema, callback) {
            console.log('updating: ' + JSON.stringify(tema));
            dagi.updateDagiTema(client, tema, callback);
          }, callback);
        },
        function(callback) {
          done(callback);
        }
      ], callback);
    });
  });
}

function indlæsDagiTema(temaNavn) {
  var queryParams = {
    login: 'dawa',
    password: 'AWSversion4',
    SERVICE: 'WFS',
    VERSION: '1.0.0',
    REQUEST: 'GetFeature',
    TYPENAME: dagiFeatureNames[temaNavn]
  };
  var paramString = _.map(queryParams, function(value, name) {
    return name + '=' + encodeURIComponent(value);
  }).join('&');
  var url = dagiUrl + '&' + paramString;
  console.log(url);
  request.get(url, function(err, response, body) {
    xml2js.parseString(body, {
      tagNameProcessors: [xml2js.processors.stripPrefix],
      trim: true
    },function(err, result) {
      var features = result.FeatureCollection.featureMember;
      var dagiTemaFragments = _.map(features, function(feature) {
        var f = feature[dagiFeatureNames[temaNavn]][0];
        return {
          tema: temaNavn,
          kode: parseInt(f.CPR_noegle[0], 10),
          navn: f.Navn[0],
          geom: mapGmlPolygon(f.geometri[0])
        };
      });
      var dagiTemaFragmentMap = _.groupBy(dagiTemaFragments, 'kode'); dagiTemaFragments = null;
      var dagiTemaer = _.map(dagiTemaFragmentMap, function(fragments) {
        var multiPolygonCoordinates = _.map(fragments, function(fragment) {
          return fragment.geom.coordinates;
        });
        return  {
          tema: temaNavn,
          kode: fragments[0].kode,
          navn: fragments[0].navn,
          geom: {
            type: 'MultiPolygon',
            coordinates: multiPolygonCoordinates
          }
        };
      });
      dagiTemaFragmentMap = null;
      putDagiTemaer(temaNavn, dagiTemaer, function(err)  {
        console.log('put dagi temaer complete: ' + err);
      });
    });
  });
}

indlæsDagiTema('sogn');