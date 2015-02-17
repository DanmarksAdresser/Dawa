"use strict";

var expect = require('chai').expect;

var bbrTransformers = require('../../bbr/common/bbrTransformers');
var transformTimestamp = bbrTransformers.internal.transformTimestamp;

describe('BBR date parsing', function() {
  it('2014-07-04 12:34:56 should be parsed as 2014-07-04T12:34:56.000', function() {
    expect(transformTimestamp('2014-07-04 12:34:56')).to.equal('2014-07-04T12:34:56.000');
  });
  it('2014-07-04 12:34:56.1 should be parsed as 2014-07-04T12:34:56.100', function() {
    expect(transformTimestamp('2014-07-04 12:34:56.1')).to.equal('2014-07-04T12:34:56.100');
  });
  it('2014-07-04T12:34:56 should be parsed as 2014-07-04T12:34:56.000', function() {
    expect(transformTimestamp('2014-07-04T12:34:56')).to.equal('2014-07-04T12:34:56.000');
  });
  it('2014-07-04T12:34:56.1 should be parsed as 2014-07-04T12:34:56.100', function() {
    expect(transformTimestamp('2014-07-04T12:34:56.1')).to.equal('2014-07-04T12:34:56.100');
  });
  it('Should ignore any timezone offset', function() {
    expect(transformTimestamp('2014-07-04T12:34:56.100Z')).to.equal('2014-07-04T12:34:56.100');
    expect(transformTimestamp('2014-07-04T12:34:56.100+02:00')).to.equal('2014-07-04T12:34:56.100');
    expect(transformTimestamp('2014-07-04T12:34:56+01:00')).to.equal('2014-07-04T12:34:56.000');
  });
});