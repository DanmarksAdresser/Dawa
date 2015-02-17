"use strict";

var bbrEvents = require('../../bbr/eventImporter/bbrEvents');

var adresseWithinInterval = bbrEvents.internal.adresseWithinInterval;
var isOnSide = bbrEvents.internal.isOnSide;
var intervalEventChanges = bbrEvents.internal.intervalEventChanges;
var createPostnrUpdate = bbrEvents.internal.createPostnrUpdate;
var createSupplerendebynavnUpdate = bbrEvents.internal.createSupplerendebynavnUpdate;
function compareHusnr(a, b) {
  var result = bbrEvents.internal.compareHusnr(a, b);
  if(result < 0) {
    expect(bbrEvents.internal.compareHusnr(b, a)).toBeGreaterThan(0);
  }
  else if(result === 0) {
    expect(bbrEvents.internal.compareHusnr(b, a)).toBe(0);
  }
  return result;
}

describe('compareHusnr', function() {
  it('28 skal være før 28A', function() {
    expect(compareHusnr('28', '28A')).toBeLessThan(0);
  });
  it('28 skal være lig 28', function() {
    expect(compareHusnr("28", "28")).toBe(0);
  });
  it('28A skal være før 28B', function() {
    expect(compareHusnr('28A', '28B')).toBeLessThan(0);
  });
  it('28A skal være lig 28A', function() {
    expect(compareHusnr('28A', '28A')).toBe(0);
  });
});

describe('adresseWithinInterval', function() {
  var ligeInterval = {husnrFra: '6', husnrTil: '28'};
  var uligeInterval = {husnrFra: '3A', husnrTil: '7K'};
  it('husnrFra og husnrTil er med i intervallet', function() {
    expect(adresseWithinInterval({ husnr: '28'}, ligeInterval)).toBe(true);
    expect(adresseWithinInterval({ husnr: '6'}, ligeInterval)).toBe(true);
    expect(adresseWithinInterval({ husnr: '7K'}, uligeInterval)).toBe(true);
  });
  it('Adresser udenfor intervallet er ikke med i intervallet', function() {
    expect(adresseWithinInterval({ husnr: '4'}, ligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '34'}, ligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '1C'}, uligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '7L'}, uligeInterval)).toBe(false);
    expect(adresseWithinInterval({ husnr: '9K'}, uligeInterval)).toBe(false);
  });
});

describe('isOnSide', function() {
  it('Ulige adresser er ikke på lige side', function() {
    expect(isOnSide('lige', {husnr: '7K'})).toBe(false);
  });
  it('Ulige adresser er på ulige side', function() {
    expect(isOnSide('ulige', {husnr: '7K'})).toBe(true);
  });
  it('Lige adresser er ikke på ulige side', function() {
    expect(isOnSide('ulige', {husnr: '6'})).toBe(false);
  });
  it('Lige adresser er  på lige side', function() {
    expect(isOnSide('lige', {husnr: '6Z'})).toBe(true);
  });
});

describe('intervalEventChanges', function () {
  var postnrEvent = {
    "kommunekode": 223,
    "vejkode": 822,
    "side": "lige",
    "intervaller": [
      {
        "husnrFra": "002",
        "husnrTil": "028Z",
        "nummer": 2960
      }
    ]
  };

  var supplerendebynavnEvent = {
    "kommunekode": 223,
    "vejkode": 822,
    "side": "lige",
    "intervaller": [
      {
        "husnrFra": "002",
        "husnrTil": "028Z",
        "navn": " Test Bynavn     "
      }
    ]
  };

  it('Adresser indenfor interval skal opdateres, hvis postnummeret er nyt', function() {
    var adresse = {
      id: 'id',
      husnr: "2",
      postnr: 1000
    };
    expect(intervalEventChanges([adresse], postnrEvent, createPostnrUpdate)).toEqual([{
      id: 'id',
      postnr: 2960
    }]);
  });

  it('Adresser indenfor interval skal ikke opdateres, hvis postnummer er uændret', function() {
    var adresse = {
      id: 'id',
      husnr: "2",
      postnr: 2960
    };
    expect(intervalEventChanges([adresse], postnrEvent, createPostnrUpdate)).toEqual([]);
  });

  it('Adresser udenfor interval skal have postnummeret sat til null', function() {
    var adresse = {
      id: 'id',
      husnr: "30",
      postnr: 2960
    };
    expect(intervalEventChanges([adresse], postnrEvent, createPostnrUpdate)).toEqual([{
      id: 'id',
      postnr: null
    }]);
  });
  it('Adresser på modsat side skal ikke ændres', function() {
    var adresse = {
      id: 'id',
      husnr: "3",
      postnr: 1000
    };
    expect(intervalEventChanges([adresse], postnrEvent, createPostnrUpdate)).toEqual([]);
  });

  it('Supplerende bynavn skal trimmes for whitespace', function() {
    var adresse = {
      id: 'id',
      husnr: "2",
      supplerendebynavn: "Gammelby"
    };
    expect(intervalEventChanges([adresse], supplerendebynavnEvent, createSupplerendebynavnUpdate)).toEqual([{
      id: 'id',
      supplerendebynavn: "Test Bynavn"
    }]);

  });
});