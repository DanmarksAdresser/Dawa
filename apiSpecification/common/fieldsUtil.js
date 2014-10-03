"use strict";

var _ = require('underscore');

exports.applySelectability = function(fields, sqlModel) {
  var allSelectableFieldNames = sqlModel.allSelectableFieldNames(_.pluck(fields, 'name'));
  fields.forEach(function(field) {
    field.selectable = _.contains(allSelectableFieldNames, field.name);
  });
};

exports.normalize = function(fields) {
  fields.forEach(function(field) {
    if(_.isUndefined(field.multi)) {
      field.multi = false;
    }
    if(!field.formatter) {
      field.formatter = _.identity;
    }
  });
};