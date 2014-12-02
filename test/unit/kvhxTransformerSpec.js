"use strict";

var kvhxTransformer = require('../../apiSpecification/adresse/kvhxTransformer');

describe('Formatting kvhx from an adresse recordset', kvhSpecs(kvhxTransformer));

function kvhSpecs(transformer) {
  return function() {
    it('should place etage in in positions 12-14', function() {
      expect(transformer.format({etage: '111'}).substring(12, 15)).toBe('111');
    });
    it('should prepend kommunekode with underscores to fill 4 characters', function() {
      expect(transformer.format({etage: 'st'}).substring(12, 15)).toBe('_st');
    });
  };
}