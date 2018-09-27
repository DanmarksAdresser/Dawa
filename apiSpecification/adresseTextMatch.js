"use strict";

var levenshtein = require('./levenshtein');
var util = require('./util');

function isWhitespace(ch) {
  return '., '.indexOf(ch) !== -1;
}

// function printCharlist(charlist) {
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + (entry.uvasket ? entry.uvasket : 'X');
//  }, ''));
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + (entry.vasket ? entry.vasket : 'X');
//  }, ''));
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + entry.op;
//  }, ''));
// }


/**
 * Consumes uvasket letters until a whitespace char is seen.
 * Any corresponding vasket letters is changed to deletes. Inserts are removed from list.
 * @param charlist
 * @returns {*[]}
 */
function consumeUntilWhitespace(charlist) {
  let result = '';
  let resultList = [];
  for(let i = 0; i < charlist.length; ++i) {
    if(charlist[i].uvasket !== null && isWhitespace(charlist[i].uvasket)) {
      resultList = resultList.concat(charlist.slice(i));
      break;
    }
    else if(charlist[i].op === 'I') {
      // drop
      result += charlist[i].uvasket;
    }
    else if(charlist[i].op === 'D') {
      // keep
      resultList.push(charlist[i]);
    }
    else {
      // keep and update becomes delete, because we remove the char from uvasket
      resultList.push({
        op: 'D',
        vasket: charlist[i].vasket,
        uvasket: null
      });
      result += charlist[i].uvasket;

    }
  }
  return [resultList, result];
}

function consume(charlist, length, mustEndWithWhitespace) {
  if(charlist.length === 0 && length === 0) {
    // end of string, we're done
    return [[], ''];
  }
  if(charlist.length === 0) {
    throw new Error('attempted to consume from empty charlist');
  }
  var entry = charlist[0];
  if(entry.op === 'I') {
    if(isWhitespace(entry.uvasket) && length === 0) {
      // we're done
      return [charlist, ''];
    }
    // consume the rest of the token
    let result = consume(charlist.slice(1), length, mustEndWithWhitespace);
    return [result[0], entry.uvasket + result[1]];
  }
  if(length === 0) {
    if(mustEndWithWhitespace) {
      // We need to check that we do not split a token
      return consumeUntilWhitespace(charlist);
    }
    return [charlist, ''];
  }
  if(entry.op === 'K' || entry.op === 'U') {
    let result =  consume(charlist.slice(1), length - 1, mustEndWithWhitespace);
    return [result[0], entry.uvasket + result[1]];
  }
  if(entry.op === 'D') {
    return consume(charlist.slice(1), length - 1, mustEndWithWhitespace);
  }
}

function consumeUnknownToken(charlist) {
  if(charlist.length === 0) {
    return [charlist, ''];
  }
  var entry = charlist[0];
  if(isWhitespace(entry.uvasket)) {
    return [charlist, ''];
  }
  if(entry.vasket !== null && !isWhitespace(entry.vasket)) {
    return [charlist, ''];
  }

  var result = consumeUnknownToken(charlist.slice(1));
  return [result[0], entry.uvasket + result[1]];
}

function isUnknownToken(charlist) {
  var firstEntry = charlist[0];
  if(!firstEntry.op === 'I') {
    throw new Error('isUnknown token should only be called with inserted text');
  }
  if(isWhitespace(firstEntry.uvasket)) {
    throw new Error('An unknown token cannot start with whitespace');
  }
  for (let entry of charlist) {
    if(entry.uvasket && isWhitespace(entry.uvasket)) {
      return true;
    }
    if(entry.vasket && !isWhitespace(entry.vasket)) {
      return false;
    }
  }
  return true;
}

function consumeBetween(charlist) {
  if(charlist.length === 0) {
    return [charlist, []];
  }
  var entry = charlist[0];
  if(entry.vasket !== null && !isWhitespace(entry.vasket)) {
    return [charlist, []];
  }
  if(entry.op === 'K') {
    return consumeBetween(charlist.slice(1));
  }
  if(entry.op === 'U' && isWhitespace(entry.uvasket)) {
    // update to a different kind of WS
    return consumeBetween(charlist.slice(1));
  }
  if(entry.op === 'U' && !isWhitespace(entry.uvasket)) {
    // an unknown token
    let  unknownTokenResult = consumeUnknownToken(charlist);
    let result = consumeBetween(unknownTokenResult[0]);
    return [result[0], [unknownTokenResult[1]].concat(result[1])]
  }
  if(entry.op === 'D') {
    return consumeBetween(charlist.slice(1));
  }
  if(entry.op === 'I' && isWhitespace(entry.uvasket)) {
     return consumeBetween(charlist.slice(1));
  }
  if(entry.op === 'I' && !isWhitespace(entry.uvasket)) {
    if(isUnknownToken(charlist)) {
      let  unknownTokenResult = consumeUnknownToken(charlist);
      let result = consumeBetween(unknownTokenResult[0]);
      return [result[0], [unknownTokenResult[1]].concat(result[1])]
    }
    return [charlist, []];
  }
  throw new Error(`unexpected for consumeBetween: ${JSON.stringify(entry)}`);
}

 function mapOps(uvasketAdrText, vasketAdrText,ops) {
   var uvasketIdx = 0;
   var vasketIdx = 0;
   return ops.map((entry) => {
     let op = entry.op;
     if(op === 'K') {
       return {
         op: 'K',
         uvasket: uvasketAdrText.charAt(uvasketIdx++),
         vasket: vasketAdrText.charAt(vasketIdx++)
       };
     }
     if(op === 'U') {
       return {
         op: 'U',
         uvasket: uvasketAdrText.charAt(uvasketIdx++),
         vasket: vasketAdrText.charAt(vasketIdx++)
       };
     }
     if(op === 'I') {
       return {
         op: 'I',
         uvasket: uvasketAdrText.charAt(uvasketIdx++),
         vasket: null
       };
     }
     if(op === 'D') {
       return {
         op: 'D',
         uvasket: null,
         vasket: vasketAdrText.charAt(vasketIdx++)
       }
     }
     throw new Error(`Unknown op ${op}`);
   });
 }

function parseTokens(uvasketText, vasketText, tokens, rules) {
  var ops = levenshtein(uvasketText.trim().toLowerCase(), vasketText.trim().toLowerCase(), 1, 2, 1).ops;
  let charlist = mapOps(uvasketText, vasketText, ops);
  const result = {
    parsedTokens: [],
    unknownTokens: []
  };

  tokens.forEach((token, index) => {
    const tokenEndsInNumber = /^\d$/.test(token.charAt(token.length - 1));
    const mustEndWithWhitespace = rules[index].mustEndAtWhitespace ||
      index === rules.length - 1 ||
      rules[index+1].mustBeginAtWhitespace ||
      tokenEndsInNumber;
    var parseResult = consume(charlist, token.length, mustEndWithWhitespace);
    var betweenResult = consumeBetween(parseResult[0]);

    result.parsedTokens = result.parsedTokens.concat(parseResult[1]);
    result.unknownTokens = result.unknownTokens.concat(betweenResult[1]);
    charlist = betweenResult[0];
  });
  return result;
}

module.exports = function (uvasketAdrText, vasketAdr) {
  var vasketAdrText = util.adressebetegnelse(vasketAdr, false);
  var fieldNames = ['vejnavn', 'husnr', 'etage', 'dør', 'supplerendebynavn', 'postnr', 'postnrnavn'];
  const rulesMap = {
    vejnavn: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: true
    },
    husnr: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: true
    },
    etage: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: false
    },
    dør: {
      mustBeginAtWhitespace: false,
      mustEndAtWhitespace: true
    },
    supplerendebynavn: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: true
    },
    postnr: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: true
    },
    postnrnavn: {
      mustBeginAtWhitespace: true,
      mustEndAtWhitespace: true
    }
  };
  let tokens = [];
  let rules = [];
  fieldNames.forEach((fieldName) => {
    if (vasketAdr[fieldName]) {
      tokens.push(vasketAdr[fieldName]);
      rules.push(rulesMap[fieldName]);
    }
  });

  var parseResult = parseTokens(uvasketAdrText, vasketAdrText, tokens, rules);
  var parsedAddress = fieldNames.reduce((memo, fieldName) => {
    if(vasketAdr[fieldName]) {
      memo[fieldName] = parseResult.parsedTokens.shift();
    }
    return memo;
  }, {});

  while(parsedAddress.husnr && parsedAddress.husnr.length > 0 && parsedAddress.husnr.charAt(0) === '0') {
    parsedAddress.husnr = parsedAddress.husnr.substring(1);
  }
  while(parsedAddress.etage && parsedAddress.etage.length > 0 && parsedAddress.etage.charAt(0) === '0') {
    parsedAddress.etage = parsedAddress.etage.substring(1);
  }
  if(parsedAddress.husnr) {
    parsedAddress.husnr = parsedAddress.husnr.replace(/^(\d+) ([A-Za-z])$/, '$1$2');
  }
  return {
    address: parsedAddress,
    unknownTokens: parseResult.unknownTokens
  };
};

module.exports.internal = {
  isWhitespace: isWhitespace,
  mapOps: mapOps,
  consume: consume,
  consumeBetween: consumeBetween,
  consumeUnknownToken: consumeUnknownToken,
  parseTokens: parseTokens
};
