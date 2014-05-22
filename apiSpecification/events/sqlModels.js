"use strict";

var _ = require('underscore');

var datamodels = { vejstykke: require('../../crud/datamodel').vejstykke };
var dbapi = require('../../dbapi');
var mappings = require('./columnMappings');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');

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
  function selectFields() {
    return datamodel.columns.map(function(columnName) {
      return 'COALESCE(i.'+columnName + ', d.'+columnName + ') AS ' + columnNameMaps[datamodelName][columnName];
    });
  }

  var baseQuery = function () {
    var query = {
      select: ['h.operation as operation', 'h.time as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectFields()),
      from: [" FROM transaction_history h" +
        " LEFT JOIN " + datamodel.table + "_history i ON (h.operation IN ('insert', 'update') AND h.sequence_number = i.valid_from)" +
        " LEFT JOIN " + datamodel.table + "_history d ON (h.operation = 'delete' AND h.sequence_number = d.valid_to)"],
      whereClauses: [],
      orderClauses: ['sekvensnummer'],
      sqlParams: []
    };
    var datamodelAlias = dbapi.addSqlParameter(query, datamodelName);
    dbapi.addWhereClause(query, "h.entity = " + datamodelAlias);
    return query;
  };
  memo[datamodelName] = {
    allSelectableFieldNames: function() {
      return ['sekvensnummer', 'operation', 'tidspunkt'].concat(_.map(datamodel.columns, function(colName) {
        return columnNameMaps[datamodelName][colName];
      }));
    },
    createQuery: function(fieldNames, params) {
      var query = baseQuery();
      if(params.sekvensnummerfra) {
        var fromAlias = dbapi.addSqlParameter(query, params.sekvensnummerfra);
        dbapi.addWhereClause(query, 'h.sequence_number >= ' + fromAlias);
      }
      if(params.sekvensnummertil) {
        var toAlias = dbapi.addSqlParameter(query, params.sekvensnummertil);
        dbapi.addWhereClause(query, 'h.sequence_number <= ' + toAlias);
      }

    }
  };
  return memo;
}, {});

module.exports = sqlModels;

var registry = require('../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});