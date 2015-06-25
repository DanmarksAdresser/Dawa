"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var oisXmlFacts = require('./oisXmlFacts');
var sqlModels = require('./sqlModels');

module.exports = Object.keys(oisXmlFacts).reduce(function(memo, entityName) {
  var xmlFacts = oisXmlFacts[entityName];
  memo[entityName] = xmlFacts.fields.map(function(field) {
    return {
      name: field.name
    };
  });
  fieldsUtil.applySelectability(memo[entityName], sqlModels[entityName]);
  fieldsUtil.normalize(memo[entityName]);
  return memo;
}, {});

