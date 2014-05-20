"use strict";

var _ = require('underscore');

var datamodels = { vejstykke: require('../../crud/datamodel').vejstykke };
var mappings = require('./columnMappings');

// maps column names to field names
var columnNameMaps = _.reduce(mappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column || col.name] = memo[col.name] || col.name;
    return memo;
  }, {});
  return memo;
}, {});

var sqlModels = _.reduce(datamodels, function(memo, datamodel, datamodelName) {
  function selectFields() {
    return datamodel.columns.map(function(columnName) {
      return columnName + ' AS ' + columnNameMaps[datamodelName][columnName];
    }).join(', ');
  }

  function createSqlString() {
    return 'SELECT ' + selectFields() + ' FROM ' + datamodel.table + ' ORDER BY ' + datamodel.key.join(', ');
  }
  memo[datamodelName] = {
    allSelectableFieldNames: function() {
      return _.map(datamodel.columns, function(colName) {
        return columnNameMaps[datamodelName][colName];
      });
    },
    createQuery: function(fieldNames, params) {

      return {
        sql: createSqlString(),
        params: []
      };
    }
  };
  return memo;
}, {});

module.exports = sqlModels;