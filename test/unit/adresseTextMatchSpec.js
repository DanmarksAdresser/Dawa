"use strict";

var expect = require('chai').expect;

var adresseTextMatch = require('../../apiSpecification/adresseTextMatch');

describe('adresseTextMatch', () => {
  it('Will correctly parse Aggustenborgade 5 C, 5.1 8000 Åhrus C', () => {
    var uvasket = "Aggustenborgade 5 C, 5.1 8000 Åhrus C";
    var vasket = {
      vejnavn: 'Augustenborggade',
      husnr: '5C',
      etage: '5',
      dør: '1',
      postnr: '8000',
      postnrnavn: 'Aarhus C'
    };
    var result = adresseTextMatch(uvasket, vasket);
    var expectedResult = {
      vejnavn: 'Aggustenborgade',
      husnr: '5 C',
      etage: '5',
      dør: '1',
      postnr: '8000',
      postnrnavn: 'Åhrus C'
    };
    expect(result).to.deep.equal(expectedResult);
  });

  it('Will correctly parse Aggustenborggade.5 STTV Langnæs 8000 Aarhus C', () => {
    var uvasket = 'Aggustenborggade.5 STTV Langnæs 8000 Aarhus C';
    var vasket = {
      vejnavn: 'Augustenborggade',
      husnr: '5',
      etage: 'st',
      dør: 'tv',
      supplerendebynavn: 'Langenæs',
      postnr: '8000',
      postnrnavn: 'Aarhus C'
    };
    var expectedResult = {
      vejnavn: 'Aggustenborggade',
      husnr: '5',
      etage: 'ST',
      dør: 'TV',
      supplerendebynavn: 'Langnæs',
      postnr: '8000',
      postnrnavn: 'Aarhus C'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result).to.deep.equal(expectedResult);
  });

  it('Will not parse foobar, but will give a result anyway', () => {
    var uvasket = 'foobar';
    var vasket = {
      vejnavn: 'Augustenborggade',
      husnr: '5',
      etage: 'st',
      dør: 'tv',
      supplerendebynavn: 'Langenæs',
      postnr: '8000',
      postnrnavn: 'Aarhus C'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result).to.deep.equal({
      dør: '',
      etage: '',
      husnr: '',
      postnr: '',
      postnrnavn: 'r',
      supplerendebynavn: '',
      vejnavn: 'fooba'
    });
  });

  it('Will correctly parse Højvangsvej 13, 8260 Viby J against "Højvangsvej 1, Stavtrup, 8260 Viby J', () => {
    var uvasket = 'Højvangsvej 13, 8260 Viby J';
    var vasket = {
      vejnavn: 'Højvangsvej',
      husnr: '1',
      supplerendebynavn: 'Stavtrup',
      postnr: '8260',
      postnrnavn: 'Viby J'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result).to.deep.equal({
      vejnavn: 'Højvangsvej',
      husnr: '13',
      supplerendebynavn: '',
      postnr: '8260',
      postnrnavn: 'Viby J'
    });
  });
});
