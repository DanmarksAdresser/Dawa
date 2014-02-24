"use strict";

var _ = require('underscore');

exports.getKeyForSelect = function(spec) {
  var keySpec = spec.model.key;
  if(!_.isArray(keySpec) && _.isObject(keySpec)) {
    keySpec = keySpec.select;
  }
  return _.isArray(keySpec) ? keySpec : [keySpec];
};


exports.getKeyForFilter = function(spec) {
  var keySpec = spec.model.key;
  if(!_.isArray(keySpec) && _.isObject(keySpec)) {
    keySpec = keySpec.filter;
  }
  return _.isArray(keySpec) ? keySpec : [keySpec];
};

exports.getColumnNameForSelect = function (spec, name) {
  if (_.isUndefined(spec.fieldMap[name].column)) {
    return name;
  }
  var columnSpec = spec.fieldMap[name].column;
  if (_.isString(columnSpec)) {
    return columnSpec;
  }
  return columnSpec.select;
};

exports.getColumnNameForWhere = function (spec, name) {
  if (_.isUndefined(spec.fieldMap[name].column)) {
    return name;
  }
  var columnSpec = spec.fieldMap[name].column;
  if (_.isString(columnSpec)) {
    return columnSpec;
  }
  return columnSpec.where;
};

exports.getSearchColumn = function(spec) {
  return exports.getColumnNameForWhere(spec, 'tsv');
};

exports.kode4String = function(kodeAsInteger) {
  return ("0000" + kodeAsInteger).slice(-4);
};
