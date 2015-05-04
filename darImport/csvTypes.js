"use strict";

var assert = require('chai').assert;
var _ = require('underscore');


module.exports = {
  uuid: {
    parse: _.identity
  },
  timestamp: {
    parse: function(str) {
      var millis = Date.parse(str);
      assert.isNumber(millis, "Date " + str + " could be parsed");
      return new Date(millis).toISOString();
    }
  },
  string: {
    parse: function(str) {
      if(!str) {
        return null;
      }
      return str.trim();
    }
  },
  integer: {
    parse: function(str) {
      return parseInt(str, 10);
    }
  },
  float: {
    parse: function(str) {
      return parseFloat(str);
    }
  }
};
