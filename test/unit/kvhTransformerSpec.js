"use strict";

var transformer = require('../../apiSpecification/adgangsadresse/kvhTransformer');

describe('Formatting kvh from an adgangsadresse recordset', function() {
  it('should place kommunekode in in positions 0-3', function() {
    expect(transformer.format({kommunekode: 1234}).substring(0, 4)).toBe('1234');
  });
  it('should prepend kommunekode with zeroes', function() {
    expect(transformer.format({kommunekode: 5}).substring(0, 4)).toBe('0005');
  });
  it('should use four zeroes if no kommunekode', function() {
    expect(transformer.format({}).substring(0, 4)).toBe('0000');
  });

  it('should place husnr in position 4-7', function() {
    expect(transformer.format({husnr: '134B'}).substring(4, 8)).toBe('134B');
  });
});
