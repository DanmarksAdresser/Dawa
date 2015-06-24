"use strict";

var expect = require('chai').expect;

var fieldParsers = require('../../../oisImport/fieldParsers');

describe('XML field parsers', function() {
  describe('UUID parser', function() {
    it('When parsing a UUID, it should assume that the UUID is contained in curly braces', function() {
      var str = '{c1651fe7-f4fe-484f-949b-ddc056dca99c}';
      var result = fieldParsers.uuid(str);
      expect(result).to.equal('c1651fe7-f4fe-484f-949b-ddc056dca99c');
    });
    it('A UUID consisting of zeroes should be parsed to null', function() {
      var str = '{00000000-0000-0000-0000-000000000000}';
      var result = fieldParsers.uuid(str);
      expect(result).to.be.null;
    });
  });
  describe('Integer parser', function() {
    it('Should parse an empty string into null', function() {
      expect(fieldParsers.integer('')).to.be.null;
    });
    it('Should parse value into an integer', function() {
      expect(fieldParsers.integer("1")).to.equal(1);
    });
    it('Should reject non-integers', function() {
      var str = '1a';
      expect(function() { return fieldParsers.integer(str); }).to.throw;
    });
  });
});