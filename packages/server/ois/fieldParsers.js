"use strict";

const _ = require('underscore');

var INTEGER_REGEX = /^[\-]?[\d]+$/;


const parseInteger = str => {
  if(str === undefined || str === null || str === '') {
    return null;
  }
  if(!INTEGER_REGEX.test(str)) {
    throw new Error('Invalid integer: ' + str);
  }
  var result = parseInt(str, 10);
  if(isNaN(result)) {
    throw new Error('Invalid integer: ' + str);
  }
  return result;
};
module.exports = {
  uniqueidentifier: function(str) {
    if(str === '') {
      return null;
    }
    // in the XML format, UUIDs are contained in curly braces,
    // which we remove
    var uuid = str.substring(1, str.length - 1);

    // for some reason, the input uses a zero UUID for absent values
    if( uuid === '00000000-0000-0000-0000-000000000000') {
      return null;
    }
    return uuid;
  },

  tinyint: parseInteger,
  smallint: parseInteger,
  int: parseInteger,
  bigint: parseInteger,
  char: _.identity,
  varchar: _.identity,
  decimal: _.identity
};
