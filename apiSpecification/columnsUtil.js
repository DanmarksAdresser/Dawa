"use strict";

var _ = require('underscore');

exports.getColumnNameForSelect = function (columnSpec, name) {
  if(_.isUndefined(columnSpec[name])) {
    return name;
  }
  return columnSpec[name].select;
};

exports.getColumnNameForWhere = function (columnSpec, name) {
  if (_.isUndefined(columnSpec[name])) {
    return name;
  }
  return columnSpec[name].where ? columnSpec[name].where : columnSpec[name].select;
};

exports.getSearchColumn = function(columnSpec) {
  return exports.getColumnNameForWhere(columnSpec, 'tsv');
};
