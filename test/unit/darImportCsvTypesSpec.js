"use strict";

var expect = require('chai').expect;

var types = require('../../darImport/csvTypes');

describe('dar CSV types', function() {
  describe('Parsing of dates', function() {
    it('Should parse a date with timezone offset', function() {
      expect(types.timestamp.parse('2008-07-05T12:16:15.690+02:00')).to.equal('2008-07-05T10:16:15.690Z');
    });
    it('Should parse a date in zulu time', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.690Z')).to.equal('2008-07-05T10:16:15.690Z');
    });
    it('Should parse dates without full millisecond precision', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.69Z')).to.equal('2008-07-05T10:16:15.690Z');
      expect(types.timestamp.parse('2008-07-05T10:16:15.6Z')).to.equal('2008-07-05T10:16:15.600Z');
      expect(types.timestamp.parse('2008-07-05T10:16:15Z')).to.equal('2008-07-05T10:16:15.000Z');
    });
    it('Currently, more than millisecond precision is truncated', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.69012Z')).to.equal('2008-07-05T10:16:15.690Z');
    });
  });
});
