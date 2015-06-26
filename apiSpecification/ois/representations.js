"use strict";

var fields = require('./fields');
var oisApiFacts = require('./oisApiFacts');
var oisDatamodels = require('./oisDatamodels');
var oisXmlFacts = require('./oisXmlFacts');
var representationUtil = require('../common/representationUtil');

module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var apiFacts = oisApiFacts[entityName];
  var xmlFacts = oisXmlFacts[entityName];
  var datamodel = oisDatamodels[entityName];
  var json = {
    fields: fields[entityName],
    mapper: function() {
      return function(row) {
        return row;
      };
    }
  };
  var flat = representationUtil.defaultFlatRepresentation(fields[entityName]);
  memo[entityName] = {
    json: json,
    flat: flat
  };
  return memo;
}, {});

console.log(JSON.stringify(module.exports, null, 2));