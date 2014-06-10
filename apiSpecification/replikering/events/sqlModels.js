"use strict";

var _ = require('underscore');

var datamodels = require('./../eventDatamodels');
var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
var parameters = require('./parameters');

// maps column names to field names
var columnNameMaps = _.reduce(mappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column || col.name] = memo[col.name] || col.name;
    return memo;
  }, {});
  return memo;
}, {});

function coaleseFields(columnName) {
  return 'COALESCE(i.' + columnName + ', d.' + columnName + ')';
}
var sqlModels = _.reduce(datamodels, function(memo, datamodel) {
  var datamodelName = datamodel.name;
  function selectFields() {
    return datamodel.columns.map(function(columnName) {
      return coaleseFields(columnName) + ' AS ' + columnNameMaps[datamodelName][columnName];
    });
  }

  var baseQuery = function () {
    var query = {
      select: ['h.operation as operation', 'h.time as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectFields()),
      from: [" transaction_history h" +
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
    stream: function(client, fieldNames, params, callback) {
      var query = baseQuery();
      if(params.sekvensnummerfra) {
        var fromAlias = dbapi.addSqlParameter(query, params.sekvensnummerfra);
        dbapi.addWhereClause(query, 'h.sequence_number >= ' + fromAlias);
      }
      if(params.sekvensnummertil) {
        var toAlias = dbapi.addSqlParameter(query, params.sekvensnummertil);
        dbapi.addWhereClause(query, 'h.sequence_number <= ' + toAlias);
      }
      if(params.tidspunktfra) {
        var timeFromAlias = dbapi.addSqlParameter(query, params.tidspunktfra);
        dbapi.addWhereClause(query, 'h.time >=' + timeFromAlias);
      }

      if(params.tidspunkttil) {
        var timeToAlias = dbapi.addSqlParameter(query, params.tidspunkttil);
        dbapi.addWhereClause(query, 'h.time <=' + timeToAlias);
      }
      // we want to be able to find events for a specific ID.
      var keyColumns = _.reduce(mappings[datamodelName], function(memo, mapping) {
        memo[mapping.name] = {
          where: coaleseFields(mapping.name)
        };
        return memo;
      }, {});
      var propertyFilter = sqlParameterImpl.simplePropertyFilter(parameters.keyParameters[datamodelName], keyColumns);
      propertyFilter(query, params);
      var dbQuery = dbapi.createQuery(query);
      dbapi.streamRaw(client, dbQuery.sql, dbQuery.params, callback);
    }
  };
  return memo;
}, {});

module.exports = sqlModels;

var registry = require('../../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});