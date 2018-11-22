"use strict";

var expect = require('chai').expect;

var levenshtein = require('../../apiSpecification/levenshtein');

describe('Levenshtein distance', () => {
  it('Edits between two empty strings are zero', () => {
    expect(levenshtein('', '', 1, 1, 1).ops).to.deep.equal([]);
  });
  it('Edits between two equal charaters are one keep op', () => {
    expect(levenshtein('a', 'a', 1, 1, 1).ops).to.deep.equal([{op: 'K', letter: 'a'}]);
  });
  it('Empty to single character results in insert', () => {
    expect(levenshtein('a', '', 1,1,1).ops).to.deep.equal([{op: 'I', letter: 'a'}]);
  });
  it('Single character to empty results in delete', () => {
    expect(levenshtein('', 'a', 1,1,1).ops).to.deep.equal([{op: 'D', letter: 'a'}]);
  });
  it('Character to another character results in update', () => {
    expect(levenshtein('a', 'b', 1,1,1).ops).to.deep.equal([{op: 'U', letter: 'a'}]);
  });
  it('sitting to kitten results in u,k,k,k,u,k,d', () => {
    expect(levenshtein('kitten', 'sitting', 1, 1, 1).ops).to.deep.equal(
      [
        {
          "letter": "k",
          "op": "U"
        },
        {
          "letter": "i",
          "op": "K"
        },
        {
          "letter": "t",
          "op": "K"
        },
        {
          "letter": "t",
          "op": "K"
        },
        {
          "letter": "e",
          "op": "U"
        },
        {
          "letter": "n",
          "op": "K"
        },
        {
          "letter": "g",
          "op": "D"
        }
      ]
    );
  });
  it('insert cost is respected', () => {
    expect(levenshtein('a', '', 2, 3, 3).distance).to.equal(2);
    expect(levenshtein('aa', 'a', 2, 3, 3).distance).to.equal(2);
  });
  it('delete cost is respected', () => {
    expect(levenshtein('', 'a', 3, 3, 2).distance).to.equal(2);
    expect(levenshtein('a', 'aa', 3, 3, 2).distance).to.equal(2);
  });
  it('update cost is respected', () => {
    expect(levenshtein('a', 'b', 2, 3, 2).distance).to.equal(3);
    expect(levenshtein('aa', 'ab', 2, 3, 2).distance).to.equal(3);
  });
  it('Should correctly compute a delete op in the middle of a string', () => {
    var vasket = 'gua';
    var uvasket ='ga';
    var expectedResult = [{op: 'K', letter: 'g'}, {op: 'D', letter: 'u'}, {op: 'K', letter: 'a'}];
    expect(levenshtein(uvasket, vasket, 1, 3, 2).ops).to.deep.equal(expectedResult);
  });
});
