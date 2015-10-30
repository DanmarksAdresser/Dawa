"use strict";

var levenshtein = require('./levenshtein');
var util = require('./util');

function createCharMap(ops) {
  var charMap = [];
  var i = 0;
  for(let op of ops) {
    if(op.op === 'K') {
      charMap.push(i);
      ++i;
    }
    else if(op.op === 'U') {
      charMap.push(i);
      ++i;
    }
    else if(op.op === 'D') {
      charMap.push(i);
    }
    else { // insert
      ++i;
    }
  }
  return charMap;
}

module.exports = function(uvasketAdrText, vasketAdr) {
  var vasketAdrText = util.adressebetegnelse(vasketAdr, false);
  var levenshteinResult = levenshtein(uvasketAdrText.toLowerCase(), vasketAdrText.toLowerCase(), 1, 3, 2);
  var charMap = createCharMap(levenshteinResult.ops);
  var uvasketIdx = 0;
  var vasketIdx = 0;

  function skipWhitespace() {
    while(uvasketIdx < uvasketAdrText.length - 1 && ' ,.'.indexOf(uvasketAdrText[uvasketIdx]) !== -1) {
      ++uvasketIdx;
    }
    while(vasketIdx < vasketAdrText.length - 1 &&' ,.'.indexOf(vasketAdrText[vasketIdx]) !== -1) {
      ++vasketIdx;
    }
  }

  function consume(tekst, untilSeparator) {
    skipWhitespace();
    if(vasketAdrText.substring(vasketIdx, vasketIdx + tekst.length) !== tekst) {
      throw new Error(`Unexpected: Tried to consume wrong text! vasketAdrText: ${vasketAdrText}, idx: ${vasketIdx}, tekst: ${tekst}`);
    }
    var nextUvasketIdx = charMap[vasketIdx + tekst.length];
    if(untilSeparator) {
      while(nextUvasketIdx < uvasketAdrText.length - 1 &&  ' ,.'.indexOf(uvasketAdrText[nextUvasketIdx]) === -1) {
        nextUvasketIdx++;
      }
    }
    var result;
    if(uvasketIdx >= nextUvasketIdx) {
      result = '';
    }
    else {
      result = uvasketAdrText.substring(uvasketIdx, nextUvasketIdx);
      uvasketIdx = nextUvasketIdx;
    }
    vasketIdx += tekst.length;
    // trim result
    result = result.replace(/^[\s,\.]+|[\s,\.]+$/g, '')
    return result;
  }

  var result = {};
  result.vejnavn = consume(vasketAdr.vejnavn, true);
  result.husnr = consume(vasketAdr.husnr, true);
  if(vasketAdr.etage) {
    result.etage = consume(vasketAdr.etage, false);
  }
  if(vasketAdr.dør) {
    result.dør = consume(vasketAdr.dør, false);
  }
  if(vasketAdr.supplerendebynavn) {
    result.supplerendebynavn = consume(vasketAdr.supplerendebynavn, true);
  }
  result.postnr = consume('' + vasketAdr.postnr, false);
  if(vasketAdr.postnrnavn) {
    result.postnrnavn = consume(vasketAdr.postnrnavn, true);
  }
  else {
    result.postnrnavn = '';
  }
  return result;
};
