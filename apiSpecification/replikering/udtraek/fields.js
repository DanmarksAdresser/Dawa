"use strict";

var _ = require('underscore');

var columnMappings = require('../columnMappings').columnMappings;

module.exports = _.reduce(Object.keys(columnMappings), function(memo, datamodelName) {
  var columnMapping = columnMappings[datamodelName];
  memo[datamodelName] = _.map(columnMapping, function(mapping) {
    return {
      name: mapping.name,
      selectable: true,
      multi: false,
      formatter: columnMapping.formatter
    };
  });
  return memo;
}, {});