"use strict";

var bbrTransformers = require('../../bbr/common/bbrTransformers');
var transformTimestamp = bbrTransformers.internal.transformTimestamp;

describe('BBR date parsing', function() {
  it('2014-07-04 12:34:56 should be parsed as 2014-07-04T12:34:56.000', function() {
    expect(transformTimestamp('2014-07-04 12:34:56')).toBe('2014-07-04T12:34:56.000');
  });
  it('2014-07-04 12:34:56.1 should be parsed as 2014-07-04T12:34:56.100', function() {
    expect(transformTimestamp('2014-07-04 12:34:56.1')).toBe('2014-07-04T12:34:56.100');
  });
  it('2014-07-04T12:34:56 should be parsed as 2014-07-04T12:34:56.000', function() {
    expect(transformTimestamp('2014-07-04 12:34:56')).toBe('2014-07-04T12:34:56.000');
  });
  it('2014-07-04T12:34:56.1 should be parsed as 2014-07-04T12:34:56.100', function() {
    expect(transformTimestamp('2014-07-04 12:34:56.1')).toBe('2014-07-04T12:34:56.100');
  });
});