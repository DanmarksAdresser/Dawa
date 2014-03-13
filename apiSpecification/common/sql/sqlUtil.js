"use strict";

var _ = require('underscore');

function existy(obj) {
  return !_.isUndefined(obj) && !_.isNull(obj);
}

var allSelectableFieldNames = function(allFieldNames, columns) {
  return allFieldNames.filter(function(fieldName) {
    return _.isUndefined(columns[fieldName]) || existy(columns[fieldName].select) || existy(columns[fieldName].column);
  });
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

var applySelect = function(sqlParts, columnSpec, fieldNames, params) {
  fieldNames.forEach( function(fieldName) {
    var clause;
    if(!columnSpec[fieldName]) {
      clause = fieldName;
    }
    else {
      var column = columnSpec[fieldName];
      var select = column.select || column.column;
      if(select) {
        if(_.isFunction(select)) {
          clause = select(sqlParts, columnSpec, params);
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

exports.assembleSqlModel = function(columnSpec, parameterImpls, baseQuery) {
  return {
    allSelectableFieldNames: function(allFieldNames) {
      return allSelectableFieldNames(allFieldNames, columnSpec);
    },
    createQuery: function(fieldNames, params) {
      var sqlParts = baseQuery();
      applySelect(sqlParts,columnSpec, fieldNames,params);
      parameterImpls.forEach(function(parameterImpl) {
        parameterImpl(sqlParts, params);
      });
      return sqlParts;
    }
  };
};