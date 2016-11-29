"use strict";

var expect = require('chai').expect;

var levenshtein = require('../../apiSpecification/levenshtein');
var adresseTextMatch = require('../../apiSpecification/adresseTextMatch');

var mapOps = adresseTextMatch.internal.mapOps;
var consume = adresseTextMatch.internal.consume;
var consumeBetween = adresseTextMatch.internal.consumeBetween;
var parseTokens = adresseTextMatch.internal.parseTokens;

const rules = [{
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}, {
  mustBeginWithWhitespace: true,
  mustContainWhitespace: false,
  mustEndWithWhitespace: true
}];

describe('adresseTextMatch', () => {
  it('Will respect whitespace rules', () => {
    const uvasket = '22, 2000';
    const vasket = '2, 2, 2000';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, '2'.length, true);
    expect(result[1]).to.equal('22');
  });
  it('Will consume a token which matches exactly', () =>  {
    var uvasket = 'token1, token2';
    var vasket = 'token1, token2';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token1'.length);
    expect(result[1]).to.equal('token1');
  });

  it('Will consume a matching token at end of string', () => {
    var uvasket = 'token';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('token');
  });

  it('Will correctly consume a longer token at end of string', () => {
    var uvasket = 'tokenfoo';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('tokenfoo');
  });

  it('will correctly consume a shorter token at end of string', () => {
    var uvasket = 'tok';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('tok');
  });

  it('Will consume a token with whitespace insertions', () => {
    var uvasket = 'tok e n';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('tok e n');
  });

  it('Will consume a token with deletions', () => {
    var uvasket = 'tkn';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('tkn');
  });

  it('Will consume a token with updates', () => {
    var uvasket = 'tkkkn';
    var vasket = 'token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1]).to.equal('tkkkn');
  });

  it('Will consume a token with leading whitespace', () => {
    var uvasket = ' token';
    var vasket =  'ttoken';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'ttoken'.length);
    expect(result[1].trim()).to.equal('token');
  });

  it('Will consume a token with trailing whitespace', () => {
    var uvasket = 'tok   token2';
    var vasket =  'token token2';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'token'.length);
    expect(result[1].trim()).to.equal('tok');
  });

  it('Will consume matching whitespace', () => {
    var uvasket = ' .,token';
    var vasket =  ' .,broken';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consumeBetween(ops);
    expect(result[0]).to.have.length('broken'.length);
  });

  it('Will consume non-matching whitespace', () => {
    var uvasket = ',. token';
    var vasket =  ' .,broken';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consumeBetween(ops);
    expect(result[0]).to.have.length('broken'.length);
  });

  it('Will detect unknown inserted token', () => {
    var uvasket = 'token foo broken';
    var vasket =  'token broken';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    ops = consume(ops, 'token'.length)[0];
    var result = consumeBetween(ops);
    expect(result[0]).to.have.length('broken'.length);
    expect(result[1]).to.deep.equal(['foo']);
  });

  it('Will detect unknown updated token', () => {
    var uvasket = 'token foo broken';
    var vasket =  'token     broken';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    ops = consume(ops, 'token'.length)[0];
    var result = consumeBetween(ops);
    expect(result[0]).to.have.length('broken'.length);
    expect(result[1]).to.deep.equal(['foo']);
  });

  it('Will consume an empty token', () => {
    var uvasket = 'token';
    var vasket = 'foo token';
    var ops = mapOps(uvasket, vasket, levenshtein(uvasket, vasket, 1, 1, 1).ops);
    var result = consume(ops, 'foo'.length);
    expect(result[1]).to.equal('');
  });

  it('Will parse a sequence of matching tokens', () => {
    var uvasket = 'foo bar,foobar';
    var vasket = 'foo bar,foobar';
    var result = parseTokens(uvasket, vasket, ['foo', 'bar', 'foobar'], rules);
    expect(result.parsedTokens).to.deep.equal(['foo', 'bar', 'foobar']);
  });

  it('Will parse a sequence of non-matching tokens', () => {
    var uvasket = 'oofooo.br, fbaaroo';
    var vasket = 'foo,bar foobar';
    var result = parseTokens(uvasket, vasket, ['foo', 'bar', 'foobar'], rules);
    expect(result.parsedTokens).to.deep.equal(['oofoo', 'br', 'fbaaroo']);
    expect(result.unknownTokens).to.deep.equal(['o']);
  });

  it('Will parse a sequence with unknown tokens in it', () => {
    var uvasket = 'foo tic tac bar toc';
    var vasket = 'foo bar';
    var result = parseTokens(uvasket, vasket, ['foo', 'bar'], rules);
    expect(result.parsedTokens).to.deep.equal(['foo', 'bar']);
    expect(result.unknownTokens).to.deep.equal(['tic', 'tac', 'toc']);
  });

  it('Will ignore a space between husnr tal and husnr bogstav', () => {
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
      husnr: '5C',
      etage: '5',
      dør: '1',
      postnr: '8000',
      postnrnavn: 'Åhrus C'
    };
    expect(result.address).to.deep.equal(expectedResult);
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
    expect(result.address).to.deep.equal(expectedResult);
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
    var result = adresseTextMatch(uvasket, vasket, rules);
    expect(result.address).to.deep.equal({
      dør: '',
      etage: '',
      husnr: '',
      postnr: '',
      postnrnavn: '',
      supplerendebynavn: '',
      vejnavn: 'foobar'
    });
  });

  it('Will correctly parse Højvangsvej 13, 8260 Viby J against "Højvangsvej 1, Stavtrup, 8260 Viby J', () => {
    var uvasket = 'Højvangsvej 13, 8260 Viby J';
    var vasket = {
      vejnavn: 'Højvangsvej',
      husnr: '1',
      postnr: '8260',
      postnrnavn: 'Viby J'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result.address).to.deep.equal({
      vejnavn: 'Højvangsvej',
      husnr: '13',
      postnr: '8260',
      postnrnavn: 'Viby J'
    });
  });

  it('Will correctly parse Højvangsvej 13, 8260 Viby J against "Højvangsvej 3, Stavtrup, 8260 Viby J', () => {
    var uvasket = 'Højvangsvej 13, 8260 Viby J';
    var vasket = {
      vejnavn: 'Højvangsvej',
      husnr: '3',
      postnr: '8260',
      postnrnavn: 'Viby J'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result.address).to.deep.equal({
      vejnavn: 'Højvangsvej',
      husnr: '13',
      postnr: '8260',
      postnrnavn: 'Viby J'
    });
  });

  it('Will correctly parse ', () => {
    var uvasket = 'Hammerensgade 1, 2., 1267 København K';
    var vasket = {
      vejnavn: 'Hammerensgade',
      husnr: '1',
      postnr: '1267',
      postnrnavn: 'København K'
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result.address).to.deep.equal({
      vejnavn: 'Hammerensgade',
      husnr: '1',
      postnr: '1267',
      postnrnavn: 'København K'
    });
    expect(result.unknownTokens).to.deep.equal(['2']);
  });

  it('Will correctly parse C.F. Richs Vej 22, 2000 Frederiksberg', () => {
    const uvasket = 'C.F. Richs Vej 22, 2000 Frederiksberg';
    const vasket = {
      vejnavn: 'C.F. Richs Vej',
      husnr: "2",
      etage: '2',
      postnr: '2000',
      postnrnavn: 'Frederiksberg'
    }
    var result = adresseTextMatch(uvasket, vasket);
    expect(result.address).to.deep.equal({
      vejnavn: 'C.F. Richs Vej',
      husnr: '22',
      etage: '',
      postnr: '2000',
      postnrnavn: 'Frederiksberg'
    });
  });

  it('Will correctly parse "højvangsvej foobar 13, 8260 viby" against "højdevej 11, 1. 8260 viby j"', () => {
    const uvasket = 'højvangsvej foobar 13, 8260 viby';
    const vasket = {
      "vejnavn": "højdevej",
      "husnr": "11",
      "etage": "1",
      "dør": "",
      "supplerendebynavn": "",
      "postnr": "8260",
      "postnrnavn": "viby j"
    };
    var result = adresseTextMatch(uvasket, vasket);
    expect(result).to.deep.equal(
      {
        "address": {
          "etage": "13",
          "husnr": "foobar",
          "postnr": "8260",
          "postnrnavn": "viby",
          "vejnavn": "højvangsvej"
        },
        "unknownTokens": []
      });
  });
});
