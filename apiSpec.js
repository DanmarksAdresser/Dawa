"use strict";

var autocompleteRepresentations = require('./apiSpecification/autocompleteRepresentations');
var awsDataModel       = require('./awsDataModel');
var baseQueries = require('./apiSpecification/baseQueries');
var columns = require('./apiSpecification/columns');
var fields = require('./apiSpecification/fields');
var geojsonRepresentations = require('./apiSpecification/geojsonRepresentations');
var jsonRepresentations = require('./apiSpecification/jsonRepresentations');
var namesAndKeys = require('./apiSpecification/namesAndKeys');
var parameters = require('./apiSpecification/parameters');
var _           = require('underscore');

var apiSpecFields = _.reduce(namesAndKeys, function(memo, nameAndKey, resourceName) {
  memo[resourceName] = _.map(fields[resourceName], function(fieldDef) {
    var field = _.clone(fieldDef);
    var fieldName = field.name;

    if(columns[resourceName][fieldName]) {
      field.column = columns[resourceName][fieldName];
    }
    return field;
  });
  return memo;
}, {});

_.forEach(namesAndKeys, function(nameAndKey, resourceName) {
  exports[resourceName] = {
    model: awsDataModel[resourceName],
    fields: apiSpecFields[resourceName],
    fieldMap: _.indexBy(apiSpecFields[resourceName], 'name'),
    parameterGroups: parameters[resourceName],
    mappers: {
      json: jsonRepresentations[resourceName].mapper,
      autocomplete: autocompleteRepresentations[resourceName].mapper
    },
    baseQuery: baseQueries[resourceName]
  };
  if(geojsonRepresentations[resourceName]) {
    exports[resourceName].mappers.geojson = geojsonRepresentations[resourceName].mapper;
  }
});

exports.allSpecNames = _.keys(namesAndKeys);
