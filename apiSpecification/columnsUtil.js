"use strict";

var _ = require('underscore');

exports.getColumnNameForSelect = function (columnSpec, name) {
  var spec = columnSpec[name];
  if(_.isUndefined(spec)) {
    return name;
  }
  if(!_.isUndefined(spec.column)) {
    return spec.column;
  }
  if(!_.isUndefined(spec.select)) {
    if(!spec.select) {
      throw "Internal error: no column " + name + ' for select';
    }
    return spec.select;
  }
};

exports.getColumnNameForWhere = function (columnSpec, name) {
  var spec = columnSpec[name];
  if (_.isUndefined(spec)) {
    return name;
  }
  if(!_.isUndefined(spec.column)) {
    return spec.column;
  }
  return spec.where ? spec.where : spec.select;
};

exports.getSearchColumn = function(columnSpec) {
  return exports.getColumnNameForWhere(columnSpec, 'tsv');
};
