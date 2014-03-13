"use strict";

var _ = require('underscore');

/*
 * Computes the list of fields that should be included in the CSV representation for the given type
 */
exports.flatCandidateFields = function(fields) {
  return fields.filter(function(field) {
    return !field.multi && field.selectable;
  });
};

exports.defaultFlatMapper = function(flatFields) {
  return function(row) {
    return _.reduce(flatFields, function(memo, field) {
      var modelValue = row[field.name];
      var formattedValue;
      if(field.formatter) {
        formattedValue = field.formatter(modelValue);
      }
      else {
        formattedValue = modelValue;
      }
      memo[field.name] = formattedValue;
      return memo;
    }, {});
  };
};
