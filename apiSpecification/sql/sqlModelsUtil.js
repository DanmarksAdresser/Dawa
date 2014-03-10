"use strict";

var _ = require('underscore');

function existy(obj) {
  return !_.isUndefined(obj) && !_.isNull(obj);
}
exports.allSelectableFields = function(allFieldNames, sqlModel) {
  var columns = sqlModel.columns;
  return allFieldNames.filter(function(fieldName) {
    return _.isUndefined(columns[fieldName]) || existy(columns[fieldName].select) || existy(columns[fieldName].column);
  });
};

exports.applySelect = function(sqlParts, sqlModel, fieldNames, params) {
  fieldNames.forEach( function(fieldName) {
    var clause;
    if(!sqlModel.columns[fieldName]) {
      clause = fieldName;
    }
    else {
      var column = sqlModel.columns[fieldName];
      var select = column.select || column.column;
      if(select) {
        if(_.isFunction(select)) {
          clause = select(sqlParts, sqlModel, params);
        }
        else {
          clause = select;
        }
        if(column.as) {
          clause += ' as ' + column.as;
        }
        else if (clause !== fieldName) {
          clause += ' as ' + fieldName;
        }
      }
      else {
        throw "Unable to create select clause for field name " + fieldName;
      }
    }
    sqlParts.select.push(clause);
  });
};