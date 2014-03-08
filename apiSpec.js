"use strict";

var autocompleteRepresentations = require('./apiSpecification/autocompleteRepresentations');
var awsDataModel       = require('./awsDataModel');
var fields = require('./apiSpecification/fields');
var sqlModels = require('./apiSpecification/sql/sqlModels');
var geojsonRepresentations = require('./apiSpecification/geojsonRepresentations');
var jsonRepresentations = require('./apiSpecification/jsonRepresentations');
var csvRepresentations = require('./apiSpecification/csvRepresentations');
var namesAndKeys = require('./apiSpecification/namesAndKeys');
var parameters = require('./apiSpecification/parameters');
var _           = require('underscore');


var apiSpecFields = _.reduce(namesAndKeys, function(memo, nameAndKey, resourceName) {
  var columnSpec = sqlModels[resourceName].columns;
  memo[resourceName] = _.map(fields[resourceName], function(fieldDef) {
    var field = _.clone(fieldDef);
    var fieldName = field.name;

    if(columnSpec[fieldName]) {
      field.column = columnSpec[fieldName];
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
      autocomplete: autocompleteRepresentations[resourceName].mapper,
      csv: csvRepresentations[resourceName].mapper
    }
  };
  if(geojsonRepresentations[resourceName]) {
    exports[resourceName].mappers.geojson = geojsonRepresentations[resourceName].mapper;
  }
});

exports.allSpecNames = _.keys(namesAndKeys);
