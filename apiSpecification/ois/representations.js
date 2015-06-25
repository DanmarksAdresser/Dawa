"use strict";

var fields = require('./fields');
var oisApiFacts = require('./oisApiFacts');
var oisDatamodels = require('./oisDatamodels');
var oisXmlFacts = require('./oisXmlFacts');
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
  console.dir(json);
  memo[entityName] = {
    json: json
  };
  return memo;
}, {});

console.log(JSON.stringify(module.exports, null, 2));