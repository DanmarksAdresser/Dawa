"use strict";

var transformer = require('../../apiSpecification/adgangsadresse/rkvhTransformer');

describe('Formatting RKVH from an adgangsadresse recordset', function() {
  it('should place three digit kommunekode in the first four characters with a prepended zero', function() {
    expect(transformer.format({kommunekode: 365})).toBe('0365');
  });
  it('should place four digit kommunekode in the first four characters', function() {
    expect(transformer.format({kommunekode: 1234})).toBe('1234');
  });
});
