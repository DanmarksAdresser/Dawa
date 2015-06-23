"use strict";

var assert = require('chai').assert;

module.exports = {
  uuid: function(str) {
    if(str === '') {
      return null;
    }
    // in the XML format, UUIDs are contained in curly braces,
    // which we remove
    return str.substring(1, str.length - 1);
  },
  integer: function(str) {
    if(str === '') {
      return null;
    }
    return parseInt(str, 10);
  },
  string: function(str) {
    return str === '' ? null : str;
  },
  timestamp: function(str) {
    var millis = Date.parse(str);
    assert.isNumber(millis, "Date " + str + " could be parsed");
    return new Date(millis).toISOString();
  }


};