"use strict";

var kvhTransformer = require('../../apiSpecification/adgangsadresse/kvhTransformer');
var kvhxTransformer = require('../../apiSpecification/adresse/kvhxTransformer');

// As the kvhxTransformer reuses the kvhTransformer functionality for the first 3 fields of the
// generated keys, we test both transformers with the same set of tests

describe('Formatting kvh from an adgangsadresse recordset', kvhSpecs(kvhTransformer));
describe('Formatting kvhx from an adresse recordset', kvhSpecs(kvhxTransformer));

function kvhSpecs(transformer) {
  return function() {
    it('should place kommunekode in in positions 0-3', function() {
      expect(transformer.format({kommunekode: 1234}).substring(0, 4)).toBe('1234');
    });
    it('should prepend kommunekode with zeroes to fill 4 characters', function() {
      expect(transformer.format({kommunekode: 5}).substring(0, 4)).toBe('0005');
    });
    it('should use four zeroes if no kommunekode', function() {
      expect(transformer.format({}).substring(0, 4)).toBe('0000');
    });

    it('should place vejkode in position 4-7', function() {
      expect(transformer.format({vejkode: 5678}).substring(4, 8)).toBe('5678');
    });

    it('should prepend husnr with zeroes to fill 4 characters', function() {
      expect(transformer.format({vejkode: 7}).substring(4, 8)).toBe('0007');
    });

    it('should place husnr in position 8-11', function() {
      expect(transformer.format({husnr: '134B'}).substring(8, 12)).toBe('134B');
    });

    it('should prepend husnr with zeroes to fill 4 characters', function() {
      expect(transformer.format({husnr: '13'}).substring(8, 12)).toBe('0013');
    });
  };
}