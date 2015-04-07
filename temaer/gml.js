"use strict";

var logger = require('../logger').forCategory('gml');
var _ = require('underscore');

function coordinatesAs2DWkt(text) {
  text = text._ || text;
  var points = text.split(' ');
  return _.map(points,function (point) {
    var coords = point.split(',');
    return coords[0] + ' ' + coords[1];
  }).join(',');
}

function poslistAs2DWkt(text) {
  text = text._ || text;

  // transform "x1 y1 x2 y2..." into [['x1','y1'],['x2','y2]]
  var points = _.chain(text.split(/[ \n]+/)).groupBy(function(element, index) {
    return Math.floor(index/2);
  }).toArray().value();

  return _.map(points,function (point) {
    return point[0] + ' ' + point[1];
  }).join(',');
}

function polygonWktCoordsText(gmlPolygon) {
  var coordinates = gmlPolygon.outerBoundaryIs[0].LinearRing[0].coordinates[0];
  var outerCoordsText = coordinatesAs2DWkt(coordinates);

  var innerBoundaryIsList = gmlPolygon.innerBoundaryIs || [];
  var innerCoordsTexts = _.map(_.map(innerBoundaryIsList, function (innerBoundaryIs) {
    return innerBoundaryIs.LinearRing[0].coordinates[0];
  }), coordinatesAs2DWkt);
  var innerCoordsText = _.reduce(innerCoordsTexts, function (memo, text) {
    return memo + ',(' + text + ')';
  }, '');
  return '((' + outerCoordsText + ')' + innerCoordsText + ')';
}

function gmlPolygonToWkt(gmlPolygon) {
  return 'POLYGON' + polygonWktCoordsText(gmlPolygon);
}

function gmlMultiPolygonToWkt(gmlMultiPolygon) {
  var texts = gmlMultiPolygon.polygonMember.map(function(polygonMember) {
    var polygon = polygonMember.Polygon[0];
    return polygonWktCoordsText(polygon);
  });
  return 'MULTIPOLYGON(' + texts.join(', ') + ')';
}

function gmlSurfaceToWkt(gmlSurface) {
  var polygonPatch = gmlSurface.patches[0].PolygonPatch[0];
  var coordinates = polygonPatch.exterior[0].LinearRing[0].posList[0];
  var outerCoordsText = poslistAs2DWkt(coordinates);

  var interiors = polygonPatch.interior || [];

  var innerCoordsTexts = _.map(_.map(interiors, function (interior) {
    return interior.LinearRing[0].posList[0];
  }), poslistAs2DWkt);
  var innerCoordsText = _.reduce(innerCoordsTexts, function (memo, text) {
    return memo + ',(' + text + ')';
  }, '');
  return 'POLYGON((' + outerCoordsText + ')' + innerCoordsText + ')';
}

exports.gmlGeometryToWkt = function(json) {
  if(json.Polygon) {
    return gmlPolygonToWkt(json.Polygon[0]);
  }
  if(json.MultiPolygon) {
    return gmlMultiPolygonToWkt(json.MultiPolygon[0]);
  }
  if(json.Surface) {
    return gmlSurfaceToWkt(json.Surface[0]);
  }
  if(json.LineString) {
    logger.error('Found LineString in geometry input, this does not make sense');
    return null;
  }

  throw new Error('Unsupported geometry type: ' + JSON.stringify(json));
};
