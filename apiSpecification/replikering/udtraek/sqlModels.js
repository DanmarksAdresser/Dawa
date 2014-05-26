"use strict";

var _ = require('underscore');

var datamodels = require('../eventDatamodels');
var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var registry = require('../../registry');

// maps column names to field names
var columnNameMaps = _.reduce(mappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column || col.name] = memo[col.name] || col.name;
    return memo;
  }, {});
  return memo;
}, {});

var sqlModels = _.reduce(datamodels, function(memo, datamodel) {
  var datamodelName = datamodel.name;
  var columnNameMap = columnNameMaps[datamodelName];
  var baseQuery = function() {
    return {
      select: _.map(datamodel.columns, function(columnName) {
        return columnName + ' AS ' + columnNameMap[columnName];
      }),
      from: [datamodel.table + '_history'],
      whereClauses: ['valid_to IS NULL'],
      orderClauses: datamodel.key,
      sqlParams: []
    };
  };
  memo[datamodelName] = {
    allSelectableFields: function() {
      return _.map(datamodel.columns, function(colName) {
        return columnNameMaps[datamodelName][colName];
      });
    },
    createQuery: function(fieldNames, params) {
      var query = baseQuery();
      return dbapi.createQuery(query);
    }
  };
  return memo;
}, {});

module.exports = sqlModels;

_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + 'udtraek', 'sqlModel', undefined, sqlModel);
});