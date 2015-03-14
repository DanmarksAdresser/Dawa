"use strict";

var expect = require('chai').expect;

var databaseTypes = require('../../psql/databaseTypes');
var Range = databaseTypes.Range;
var Husnr = databaseTypes.Husnr;

describe('Parsing and serialization of composite types', function() {
  it('Should correctly parse husnr that contains a bogstav', function() {
    var literal = '(12,B)';
    expect(databaseTypes.Husnr.fromPostgres(literal)).to.deep.equal(new databaseTypes.Husnr(12, 'B'));
  });
  it('Should correctly parse husnr that does not contain a bogstav', function() {
    var literal = '(12,)';
    expect(databaseTypes.Husnr.fromPostgres(literal)).to.deep.equal(new databaseTypes.Husnr(12, null));
  });

  it('Should correctly parse husnr range', function () {
    var literal = '["(12,B)","(13,)")';
    expect(databaseTypes.Range.fromPostgres(literal, databaseTypes.Husnr.fromPostgres)).to.deep.equal(
      new Range(new Husnr(12, 'B'), new Husnr(13, null), '[)'));
  });

  it('Should correctly parse husnr range with infinity', function() {
    var literal = '["(12,B)",)';
    var parsedValue = databaseTypes.Range.fromPostgres(literal, databaseTypes.Husnr.fromPostgres);
    expect(parsedValue.upperInfinite).to.be.true;
    expect(parsedValue.upper).to.not.be.defined;
    expect(parsedValue.upperOpen).to.be.true;
  });

  it('Should correctly parse closed range', function() {
    var literal = '["(12,B)","(13,)"]';
    var parsedValue = databaseTypes.Range.fromPostgres(literal, databaseTypes.Husnr.fromPostgres);
    expect(parsedValue.upperOpen).to.be.false;
    expect(parsedValue.lowerOpen).to.be.false;
  });

  it('Should correctly parse open range', function() {
    var literal = '("(12,B)","(13,)")';
    var parsedValue = databaseTypes.Range.fromPostgres(literal, databaseTypes.Husnr.fromPostgres);
    expect(parsedValue.upperOpen).to.be.true;
    expect(parsedValue.lowerOpen).to.be.true;
  });

  it('Should correctly parse the empty range', function(){
    var literal = 'empty';
    var parsedValue = databaseTypes.Range.fromPostgres(literal, databaseTypes.Husnr.fromPostgres);
    expect(parsedValue).to.deep.equal(new Range(null, null, 'empty'));
  });
});