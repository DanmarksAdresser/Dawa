"use strict";

var transformer = require('../../apiSpecification/adresse/kvhxTransformer');

describe('Formatting kvhx from an adresse recordset', function() {
  it('should place etage in in positions 12-14', function() {
    expect(transformer.format({etage: '111'}).substring(12, 15)).toBe('111');
  });
  it('should prepend etage with underscores to fill 4 characters', function() {
    expect(transformer.format({etage: 'st'}).substring(12, 15)).toBe('_st');
  });
  it('should represent no etage with underscores', function() {
    expect(transformer.format({etage: null}).substring(12, 15)).toBe('___');
  });
  it('should represent undefined etage with underscores', function() {
    expect(transformer.format({}).substring(12, 15)).toBe('___');
  });

  it('should place dør in in positions 15-18', function() {
    expect(transformer.format({dør: '9999'}).substring(15, 19)).toBe('9999');
  });
  it('should prepend dør with underscores to fill 4 characters', function() {
    expect(transformer.format({dør: 'th'}).substring(15, 19)).toBe('__th');
  });
  it('should represent no dør with underscores', function() {
    expect(transformer.format({dør: null}).substring(15, 19)).toBe('____');
  });
  it('should represent undefined dør with underscores', function() {
    expect(transformer.format({}).substring(15, 19)).toBe('____');
  });
});
