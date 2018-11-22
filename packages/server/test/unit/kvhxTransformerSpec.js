"use strict";

var expect = require('chai').expect;

var transformer = require('../../apiSpecification/adresse/kvhxTransformer');

describe('Formatting kvhx from an adresse recordset', function() {
  it('should place etage in in positions 12-14', function() {
    expect(transformer.format({etage: '111'}).substring(12, 15)).to.equal('111');
  });
  it('should prepend etage with underscores to fill 4 characters', function() {
    expect(transformer.format({etage: 'st'}).substring(12, 15)).to.equal('_st');
  });
  it('should represent no etage with underscores', function() {
    expect(transformer.format({etage: null}).substring(12, 15)).to.equal('___');
  });
  it('should represent undefined etage with underscores', function() {
    expect(transformer.format({}).substring(12, 15)).to.equal('___');
  });

  it('should place dør in in positions 15-18', function() {
    expect(transformer.format({dør: '9999'}).substring(15, 19)).to.equal('9999');
  });
  it('should prepend dør with underscores to fill 4 characters', function() {
    expect(transformer.format({dør: 'th'}).substring(15, 19)).to.equal('__th');
  });
  it('should represent no dør with underscores', function() {
    expect(transformer.format({dør: null}).substring(15, 19)).to.equal('____');
  });
  it('should represent undefined dør with underscores', function() {
    expect(transformer.format({}).substring(15, 19)).to.equal('____');
  });
});

describe('Parsing kvhx for an adresse query', function() {
  it('should extract etage', function() {
    expect(transformer.parse('123412341234stu____').etage).to.equal('stu');
  });
  it('should remove leading underscores from etage', function() {
    expect(transformer.parse('123412341234_st____').etage).to.equal('st');
  });
  it('should represent etage consisting of all underscores as null', function() {
    // querying for null values depends on this, and the parameters have already been parsed, so the transformer needs to do it
    expect(transformer.parse('123412341234___1234').etage).to.equal(null);
  });
  it('should extract dør', function() {
    expect(transformer.parse('123412341234123door').dør).to.equal('door');
  });
  it('should remove leading underscores from dør', function() {
    expect(transformer.parse('123412341234123___2').dør).to.equal('2');
  });
  it('should represent dør consisting of all underscores as null', function() {
    // querying for null values depends on this, and the parameters have already been parsed, so the transformer needs to do it
    expect(transformer.parse('123412341234123____').dør).to.equal(null);
  });
  it('should not throw exceptions because of a malformed parameter value', function() {
    transformer.parse('4201074006_st__tv'); // this is one character short of being a proper kvhx value
  });
});

describe('Validating kvhx', function() {
  it('fails for length less than 19', function() {
    try {
      transformer.validate('12341234123');
      expect(false).to.equal(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).to.contain('12341234123'); // must indicate the received parameter value
      expect(e).to.contain('length 19'); // must indicate the required length
    }
  });

  it('fails for length greater than 19', function() {
    try {
      transformer.validate('01234567890123456789');
      expect(false).to.equal(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).to.contain('01234567890123456789'); // must indicate the received parameter value
      expect(e).to.contain('length 19'); // must indicate the required length
    }
  });

  it('fails for non numeric kommunekode', function() {
    try {
      transformer.validate('komm123412341231234');
      expect(false).to.equal(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).to.contain('komm12341234'); // must indicate the received parameter value
      expect(e).to.contain('digits'); // must indicate that the error is about digits
    }
  });

  it('fails for non numeric vejkode', function() {
    try {
      transformer.validate('1234vejk12341231234');
      expect(false).to.equal(true); // if we reach this point without an exception throw, it's a test failure
    } catch (e) {
      expect(e).to.contain('1234vejk1234'); // must indicate the received parameter value
      expect(e).to.contain('digits'); // must indicate that the error is about digits
    }
  });
});