"use strict";

var _ = require('underscore');

var fields = require('./fields');
var oisApiFacts = require('./oisApiFacts');
var oisDatamodels = require('./oisDatamodels');
var oisXmlFacts = require('./oisXmlFacts');
var representationUtil = require('../common/representationUtil');

module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var json = {
    fields: fields[entityName],
    mapper: function() {
      return _.identity;
    }
  };
  var flat = representationUtil.defaultFlatRepresentation(fields[entityName]);
  memo[entityName] = {
    json: json,
    flat: flat
  };
  return memo;
}, {});