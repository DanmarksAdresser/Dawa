"use strict";

var _ = require('underscore');

exports.as2DWkt = function(text) {
  text = text._ || text;
  var points = text.split(' ');
  return _.map(points,function (point) {
    var coords = point.split(',');
    return coords[0] + ' ' + coords[1];
  }).join(',');
};

exports.gmlGeometryToWkt = function(json) {
  if(json.Polygon) {
    var polygon = json.Polygon[0];
    return exports.gmlPolygonToWkt(polygon);
  }
  if(json.MultiPolygon) {
    var multiPolygon = json.MultiPolygon[0];
    return exports.gmlMultiPolygonToWkt(multiPolygon);
  }
  throw new Error('Unsupported geometry type');
};

exports.polygonWktCoordsText = function(gmlPolygon) {
  var coordinates = gmlPolygon.outerBoundaryIs[0].LinearRing[0].coordinates[0];
  var outerCoordsText = exports.as2DWkt(coordinates);

  var innerBoundaryIsList = gmlPolygon.innerBoundaryIs || [];
  var innerCoordsTexts = _.map(_.map(innerBoundaryIsList, function (innerBoundaryIs) {
    return innerBoundaryIs.LinearRing[0].coordinates[0];
  }), exports.as2DWkt);
  var innerCoordsText = _.reduce(innerCoordsTexts, function (memo, text) {
    return memo + ',(' + text + ')';
  }, '');
  return '((' + outerCoordsText + ')' + innerCoordsText + ')';
};

exports.gmlMultiPolygonToWkt = function(gmlMultiPolygon) {
  var texts = gmlMultiPolygon.polygonMember.map(function(polygonMember) {
    var polygon = polygonMember.Polygon[0];
    return exports.polygonWktCoordsText(polygon);
  });
  var result = 'MULTIPOLYGON(' + texts.join(', ') + ')';
  return  result;
};

exports.gmlPolygonToWkt = function(gmlPolygon) {
  return 'POLYGON' + exports.polygonWktCoordsText(gmlPolygon);
};

