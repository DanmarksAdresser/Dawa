"use strict";

var _ = require('underscore');

function as2DWkt(text) {
  text = text._ || text;
  var points = text.split(' ');
  return _.map(points,function (point) {
    var coords = point.split(',');
    return coords[0] + ' ' + coords[1];
  }).join(',');
}

function polygonWktCoordsText(gmlPolygon) {
  var coordinates = gmlPolygon.outerBoundaryIs[0].LinearRing[0].coordinates[0];
  var outerCoordsText = as2DWkt(coordinates);

  var innerBoundaryIsList = gmlPolygon.innerBoundaryIs || [];
  var innerCoordsTexts = _.map(_.map(innerBoundaryIsList, function (innerBoundaryIs) {
    return innerBoundaryIs.LinearRing[0].coordinates[0];
  }), as2DWkt);
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

exports.gmlGeometryToWkt = function(json) {
  if(json.Polygon) {
    var polygon = json.Polygon[0];
    return gmlPolygonToWkt(polygon);
  }
  if(json.MultiPolygon) {
    var multiPolygon = json.MultiPolygon[0];
    return gmlMultiPolygonToWkt(multiPolygon);
  }
  throw new Error('Unsupported geometry type');
};
