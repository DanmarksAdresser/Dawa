"use strict";

var expect = require('chai').expect;
var _ = require('underscore');

var commonParameters = require('../../apiSpecification/common/commonParameters');
var parameterParsing = require('../../parameterParsing');
describe('Validation of reverse geocoding parameter', function() {
  it('Shold invalidate parameters that are outside the permitted bounding box', function() {
    var invalid = {
      x: 200,
      y: 300,
      srid: 4326
    };
    var params = commonParameters.crs.concat(commonParameters.reverseGeocoding);
    var paramMap = _.indexBy(params, 'name');
    var validationResult = parameterParsing.validateParameters(invalid, paramMap);
    expect(validationResult).to.have.length(2);
  });

  it('Should invalidate a polygon which has a coordinate outside the permitted bounding box', function() {
    var invalid = {
      polygon: [[[10.3,55.3],[-2000,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]],
      srid: 4326
    };
    var params = commonParameters.crs.concat(commonParameters.geomWithin);
    var paramMap = _.indexBy(params, 'name');
    var validationResult = parameterParsing.validateParameters(invalid, paramMap);
    expect(validationResult).to.have.length(1);
  });

  it('Should invalidate a circle which has center outside the permitted bounding box', function() {
    var invalid = {
      cirkel: "10,10,1",
      srid: 25832
    };
    var params = commonParameters.crs.concat(commonParameters.geomWithin);
    var paramMap = _.indexBy(params, 'name');
    var validationResult = parameterParsing.validateParameters(invalid, paramMap);
    expect(validationResult).to.have.length(1);
  });
});