"use strict";

var levenshtein = require('./levenshtein');
var util = require('./util');

function isWhitespace(ch) {
  return '., '.indexOf(ch) !== -1;
}

//function printCharlist(charlist) {
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + (entry.uvasket ? entry.uvasket : 'X');
//  }, ''));
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + (entry.vasket ? entry.vasket : 'X');
//  }, ''));
//  console.log(charlist.reduce((memo, entry) => {
//    return memo + entry.op;
//  }, ''));
//}

function consume(charlist, length) {
  if(charlist.length === 0 && length === 0) {
    return [[], ''];
  }
  if(charlist.length === 0) {
    throw new Error('attempted to consume from empty charlist');
  }
  var entry = charlist[0];
  if(entry.op === 'I') {
    if(isWhitespace(entry.uvasket) && length === 0) {
      return [charlist, ''];
    }
    let result = consume(charlist.slice(1), length);
    return [result[0], entry.uvasket + result[1]];
  }
  if(length === 0) {
    return [charlist, ''];
  }
  if(entry.op === 'K' || entry.op === 'U') {
    let result =  consume(charlist.slice(1), length - 1);
    return [result[0], entry.uvasket + result[1]];
  }
  if(entry.op === 'D') {
    return consume(charlist.slice(1), length - 1);
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

function parseTokens(uvasketText, vasketText, tokens) {
  var ops = levenshtein(uvasketText.trim().toLowerCase(), vasketText.trim().toLowerCase(), 1, 2, 1).ops;
  var charlist = mapOps(uvasketText, vasketText, ops);
  var initial = {
    parsedTokens: [],
    unknownTokens: [],
    charlist: charlist
  };

  return tokens.reduce((memo, token) => {
    //console.log(`consuming ${token} from `);
    //printCharlist(memo.charlist);
    var parseResult = consume(memo.charlist, token.length);
    //console.log('consuming between from');
    //printCharlist(parseResult[0]);

    var betweenResult = consumeBetween(parseResult[0]);
    return {
      parsedTokens: memo.parsedTokens.concat(parseResult[1]),
      unknownTokens: memo.unknownTokens.concat(betweenResult[1]),
      charlist: betweenResult[0]
    };
  }, initial);
}

module.exports = function (uvasketAdrText, vasketAdr) {
  var vasketAdrText = util.adressebetegnelse(vasketAdr, false);
  var fieldNames = ['vejnavn', 'husnr', 'etage', 'dør', 'supplerendebynavn', 'postnr', 'postnrnavn'];
  var tokens = fieldNames.reduce((memo, fieldName) => {
    if (vasketAdr[fieldName]) {
      memo.push(vasketAdr[fieldName]);
    }
    return memo;
  }, []);

  var parseResult = parseTokens(uvasketAdrText, vasketAdrText, tokens);
  var parsedAddress = fieldNames.reduce((memo, fieldName) => {
    if(vasketAdr[fieldName]) {
      memo[fieldName] = parseResult.parsedTokens.shift();
    }
    return memo;
  }, {});
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
