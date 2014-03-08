"use strict";

var _ = require('underscore');
var sqlModels = require('./apiSpecification/sql/sqlModels');
var sqlModelsUtil = require('./apiSpecification/sql/sqlModelsUtil');

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

exports.getParameterGroupsForSpec = function(spec, groupNames, formatParameterSpec, pagingParameterSpec) {
  var result = {};
  if(_.contains(groupNames, 'format')) {
    result.format = formatParameterSpec;
  }
  if(_.contains(groupNames,'paging')) {
    result.paging = pagingParameterSpec;
  }
  groupNames.forEach(function(groupName) {
    if(spec.parameterGroups[groupName]) {
      result[groupName] = spec.parameterGroups[groupName];
    }
  });
  return result;
};

 exports.initialQuery = function(spec, params) {
  if(spec.baseQuery) {
    return spec.baseQuery(params);
  }
  var query = {
    select: "  SELECT * FROM " + spec.model.plural,
    whereClauses: [],
    orderClauses: [],
    offset: undefined,
    limit: undefined,
    sqlParams: []
  };
  return query;
};

exports.createSqlParts = function(spec, parameterGroups, params) {
  var sqlParts;
  var sqlModel = sqlModels[spec.model.name];
  sqlParts = sqlModel.baseQuery();
  var fieldNames = _.pluck(spec.fields, 'name');
  sqlModelsUtil.applySelect(sqlParts,sqlModel, sqlModelsUtil.allSelectableFields(fieldNames, sqlModel),params);
  _.each(parameterGroups, function(group) {
    if(group.applySql) {
      group.applySql(sqlParts, params, spec);
    }
  });

  return sqlParts;
};
