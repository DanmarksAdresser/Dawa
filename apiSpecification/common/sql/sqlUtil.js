"use strict";

var util = require('util');
var _ = require('underscore');

var dbapi = require('../../../dbapi');

function existy(obj) {
  return !_.isUndefined(obj) && !_.isNull(obj);
}

exports.selectIsoDate = function(col) {
  return "to_char(" + col + " at time zone 'UTC', 'YYYY-MM-DD\"T\"HH:MI:SS.MSZ')"
};

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

function addSelect(columnSpec, fieldName, sqlParts, params) {
  var clause;
  if (!columnSpec[fieldName]) {
    clause = fieldName;
  }
  else {
    var column = columnSpec[fieldName];
    var select = column.select || column.column;
    if (select) {
      if (_.isFunction(select)) {
        clause = select(sqlParts, columnSpec, params);
      }
      else {
        clause = select;
      }
      if (column.as) {
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
}
var applySelect = function(sqlParts, columnSpec, fieldNames, params) {
  fieldNames.forEach( function(fieldName) {
    addSelect(columnSpec, fieldName, sqlParts, params);
  });
};

exports.addSelect = addSelect;

exports.InvalidParametersError = function(message) {
  this.name = 'InvalidParametersError';
  this.message = message || 'Invalid parameter';
};
util.inherits(exports.InvalidParametersError, Error);

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
      return dbapi.createQuery(sqlParts);
    },
    query: function(client, fieldNames, params, callback) {
      var query = this.createQuery(fieldNames, params);
      dbapi.queryRaw(client, query.sql, query.params, callback);
    },
    stream: function(client, fieldNames, params, callback) {
      var query = this.createQuery(fieldNames, params);
      dbapi.streamRaw(client, query.sql, query.params, callback);
    }
  };
};