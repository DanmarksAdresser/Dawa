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
        return xmlFacts.fields.reduce(function(memo, field) {
          memo[field.name] = row[field.name.toLowerCase()];
          return memo;
        }, {});
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