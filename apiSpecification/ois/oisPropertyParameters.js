"use strict";

var _ = require('underscore');

var oisApiFacts = require('./oisApiFacts');
var oisXmlFacts = require('./oisXmlFacts');

module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var apiFacts = oisApiFacts[entityName];
  var xmlFacts = oisXmlFacts[entityName];
  var filterableFields = apiFacts.filterableFields;
  var parameters = filterableFields.reduce(function(memo, fieldName) {
    var xmlField = _.find(xmlFacts.fields, function(xmlField) {
      return xmlField.dawaName === fieldName;
    });

    var parameter = {
      name: fieldName,
      multi: true
    };
    if (xmlField.type === 'integer' || xmlField.type === 'string') {
      parameter.type = xmlField.type;
    }
    else if(xmlField.type === 'uuid') {
      parameter.type = 'string';
    }
    else {
      throw new Error('Cannot filter parameters of type ' + xmlField.type);
    }
    memo.push(parameter);
    return memo;
  }, []);
  memo[entityName] = parameters;
  return memo;
}, {});
