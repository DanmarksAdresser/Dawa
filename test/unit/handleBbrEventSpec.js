"use strict";

var handleBbrEvent = require('../../bbr/eventImporter/handleBbrEvent');

var adresseWithinInterval = handleBbrEvent.internal.adresseWithinInterval;
function compareHusnr(a, b) {
  var result = handleBbrEvent.internal.compareHusnr(a, b);
  if(result < 0) {
    expect(handleBbrEvent.internal.compareHusnr(b, a)).toBeGreaterThan(0);
  }
  else if(result === 0) {
    expect(handleBbrEvent.internal.compareHusnr(b, a)).toBe(0);
  }
  return result;
}

describe('compareHusnr', function() {
  it('28 skal være før 28A', function() {
    expect(compareHusnr('28', '28A')).toBeLessThan(0);
  });
  it('28 skal være lig 28', function() {
    expect(compareHusnr(28, 28)).toBe(0);
  });
  it('28A skal være før 28B', function() {
    expect(compareHusnr('28A', '28B')).toBeLessThan(0);
  });
  expect('28A skal være lig 28A', function() {
    expect(compareHusnr('28A', '28A')).toBe(0);
  });
});

describe('adresseWithinInterval', function() {
  var ligeInterval = {husnrFra: '6', husnrTil: '28', side: 'lige'};
  var uligeInterval = {husnrFra: '3A', husnrTil: '7K', side: 'ulige'};
  it('husnrFra og husnrTil er med i intervallet', function() {
    expect(adresseWithinInterval({ husnr: '28'}, ligeInterval)).toBe(true);
    expect(adresseWithinInterval({ husnr: '6'}, ligeInterval)).toBe(true);
  });
  it('Adresser udenfor intervallet er ikke med i intervallet', function() {
    expect(adresseWithinInterval({ husnr: '4'}, ligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '34'}, ligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '1C'}, uligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '9K'}, uligeInterval)).toBe(false);
  });

  it('Ulige adresser er ikke med i lige intervaller', function() {
    expect(adresseWithinInterval({husnr: '7K'}, ligeInterval)).toBe(false);
  });
  it('Lige adresser er ikke med i ulige intervaller', function() {
    expect(adresseWithinInterval({husnr: '6'}, uligeInterval)).toBe(false);

  });
});