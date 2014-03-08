"use strict";

var _ = require('underscore');

var fields = require('./fields');
var sqlModels = require('./sql/sqlModels');
var sqlModelsUtil = require('./sql/sqlModelsUtil');

exports.allSelectableFields = function(typeName) {
  var fieldList = fields[typeName];
  var allSelectableFieldNames = sqlModelsUtil.allSelectableFields(_.pluck(fieldList, 'name'), sqlModels[typeName]);

  return _.filter(fieldList, function(field) {
    return _.contains(allSelectableFieldNames, field.name);
  });
};