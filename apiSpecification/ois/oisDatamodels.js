"use strict";

var _ = require('underscore');

var oisXmlFacts = require('./oisXmlFacts');
var oisApiFacts = require('./oisApiFacts');

module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var xmlFacts = oisXmlFacts[entityName];
  var apiFacts = oisApiFacts[entityName];
  var datamodel = {
    name: entityName,
    table: apiFacts.table,
    columns: _.pluck(xmlFacts.fields, 'name'),
    key: apiFacts.key
  };
  memo[entityName] = datamodel;
  return memo;
}, {});