"use strict";

var _ = require('underscore');
module.exports = {

  getKeyForSelect: function(spec) {
    var keySpec = spec.model.key;
    if(!_.isArray(keySpec) && _.isObject(keySpec)) {
      keySpec = keySpec.select;
    }
    return _.isArray(keySpec) ? keySpec : [keySpec];
  },

  getKeyForFilter: function(spec) {
    var keySpec = spec.model.key;
    if(!_.isArray(keySpec) && _.isObject(keySpec)) {
      keySpec = keySpec.filter;
    }
    return _.isArray(keySpec) ? keySpec : [keySpec];
  },
  getColumnNameForSelect: function (spec, name) {
    if (_.isUndefined(spec.fieldMap[name].column)) {
      return name;
    }
    var columnSpec = spec.fieldMap[name].column;
    if (_.isString(columnSpec)) {
      return columnSpec;
    }
    return columnSpec.select;
  },

  getColumnNameForWhere: function (spec, name) {
    if (_.isUndefined(spec.fieldMap[name].column)) {
      return name;
    }
    var columnSpec = spec.fieldMap[name].column;
    if (_.isString(columnSpec)) {
      return columnSpec;
    }
    return columnSpec.where;
  }

};