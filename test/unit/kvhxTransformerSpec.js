"use strict";

var transformer = require('../../apiSpecification/adresse/kvhxTransformer');

describe('Formatting kvhx from an adresse recordset', function() {
  it('should place etage in in positions 12-14', function() {
    expect(transformer.format({etage: '111'}).substring(12, 15)).toBe('111');
  });
  it('should prepend etage with underscores to fill 4 characters', function() {
    expect(transformer.format({etage: 'st'}).substring(12, 15)).toBe('_st');
  });

  it('should place dør in in positions 15-18', function() {
    expect(transformer.format({dør: '9999'}).substring(15, 19)).toBe('9999');
  });
  it('should prepend dør with underscores to fill 4 characters', function() {
    expect(transformer.format({dør: 'th'}).substring(15, 19)).toBe('__th');
  });
});
