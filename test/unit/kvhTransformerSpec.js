"use strict";

var kvhTransformer = require('../../apiSpecification/adgangsadresse/kvhTransformer');
var kvhxTransformer = require('../../apiSpecification/adresse/kvhxTransformer');

// As the kvhxTransformer reuses the kvhTransformer functionality for the first 3 fields of the
// generated keys, we test both transformers with the same set of tests

function kvhFormattingSpecs(transformer) {
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

    it('should prepend vejkode with zeroes to fill 4 characters', function() {
      expect(transformer.format({vejkode: 7}).substring(4, 8)).toBe('0007');
    });

    it('should place husnr in position 8-11', function() {
      expect(transformer.format({husnr: '134B'}).substring(8, 12)).toBe('134B');
    });

    it('should prepend husnr with underscores to fill 4 characters', function() {
      expect(transformer.format({husnr: '13'}).substring(8, 12)).toBe('__13');
    });
  };
}

function kvhParsingSpecs(transformer, trailingFiller) {
  return function() {
    it('should extract kommunekode', function() {
      expect(transformer.parse('12340000____' + trailingFiller).kommunekode).toBe('1234');
    });
    it('should extract vejkode', function() {
      expect(transformer.parse('00004321____' + trailingFiller).vejkode).toBe('4321');
    });
    it('should extract husnr', function() {
      expect(transformer.parse('00000000143B' + trailingFiller).husnr).toBe('143B');
    });
    it('should remove leading underscores from husnr', function() {
      expect(transformer.parse('00000000__7B' + trailingFiller).husnr).toBe('7B');
    });
    it('should represent husnr consisting of all underscores as null', function() {
      expect(transformer.parse('00000000____' + trailingFiller).husnr).toBe(null);
    });
    it('should not throw exceptions because of a malformed parameter value', function() {
      transformer.parse('4201074006'); // this is one character short of being a proper kvh value
    });
  };
}

describe('Validating kvh', function() {
  it('fails for length less than 12', function() {
    try {
      kvhTransformer.validate('12341234123');
      expect(false).toBe(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).toContain('12341234123'); // must indicate the received parameter value
      expect(e).toContain('length 12'); // must indicate the required length
    }
  });

  it('fails for length greater than 12', function() {
    try {
      kvhTransformer.validate('1234123412341234');
      expect(false).toBe(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).toContain('1234123412341234'); // must indicate the received parameter value
      expect(e).toContain('length 12'); // must indicate the required length
    }
  });

  it('fails for non numeric kommunekode', function() {
    try {
      kvhTransformer.validate('komm12341234');
      expect(false).toBe(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).toContain('komm12341234'); // must indicate the received parameter value
      expect(e).toContain('digits'); // must indicate that the error is about digits
    }
  });

  it('fails for non numeric vejkode', function() {
    try {
      kvhTransformer.validate('1234vejk1234');
      expect(false).toBe(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).toContain('1234vejk1234'); // must indicate the received parameter value
      expect(e).toContain('digits'); // must indicate that the error is about digits
    }
  });
});


describe('Formatting kvh from an adgangsadresse recordset', kvhFormattingSpecs(kvhTransformer));
describe('Formatting kvh part of kvhx from an adresse recordset', kvhFormattingSpecs(kvhxTransformer));

describe('Parsing kvh for an adgangsadresse query', kvhParsingSpecs(kvhTransformer, ''));
describe('Parsing kvh part of kvhx for an adresse query', kvhParsingSpecs(kvhxTransformer, '???????'));
