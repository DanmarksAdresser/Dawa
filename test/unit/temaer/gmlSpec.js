"use strict";

var gml = require('../../../temaer/gml');

function simplePolygon() {
  return {
    outerBoundaryIs: [{
      LinearRing: [{
        coordinates: ['1,1 6,8 1,8 1,1']
      }]
    }]
  };
}

describe('Transforming gml polygon', function() {
  it("should parse the first ring for a simple polygon with no inner boundary using default cs and ts separators", function() {
    expect(gml.gmlGeometryToWkt({Polygon: [simplePolygon()]})).toBe('POLYGON((1 1,6 8,1 8,1 1))');
  });
  it('should parse the first inner and first outer ring for a polygon with an inner boundary using default cs and ts separators', function() {
    var polygon = simplePolygon();
    polygon.innerBoundaryIs = [{
      LinearRing: [{
        coordinates: ['2,7 4,7 2,3 2,7']
      }]
    }];
    expect(gml.gmlGeometryToWkt({Polygon: [polygon]})).toBe('POLYGON((1 1,6 8,1 8,1 1),(2 7,4 7,2 3,2 7))');
  });
});

describe('Transforming gml multipolygon', function() {
  it("should parse the first ring of each polygon in the first polygonmember for a simple multipolygon with no inner boundary using default cs and ts separators", function() {
    expect(gml.gmlGeometryToWkt({
      MultiPolygon: [
        {polygonMember: [
          {Polygon: [simplePolygon()]},
          {Polygon: [simplePolygon()]}
        ]}
      ]})).toBe('MULTIPOLYGON(((1 1,6 8,1 8,1 1)), ((1 1,6 8,1 8,1 1)))');
  });
  // multipolygon parsing reuses the polygin parsing logic, so we don't test the inner boundary case
});
