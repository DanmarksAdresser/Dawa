"use strict";

var _ = require('underscore');

var datamodels = require('./../eventDatamodels');
var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
var sqlUtil = require('../../common/sql/sqlUtil');
var parameters = require('./parameters');

function coaleseFields(columnName) {
  return 'COALESCE(i.' + columnName + ', d.' + columnName + ')';
}
function createSqlModel( columnMappings , simpleFilterParameters, baseQuery) {
  return {
    allSelectableFieldNames: function () {
      return ['sekvensnummer', 'operation', 'tidspunkt'].concat(_.pluck(columnMappings, 'name'));
    },
    stream: function (client, fieldNames, params, callback) {
      var query = baseQuery();
      if (params.sekvensnummerfra) {
        var fromAlias = dbapi.addSqlParameter(query, params.sekvensnummerfra);
        dbapi.addWhereClause(query, 'h.sequence_number >= ' + fromAlias);
      }
      if (params.sekvensnummertil) {
        var toAlias = dbapi.addSqlParameter(query, params.sekvensnummertil);
        dbapi.addWhereClause(query, 'h.sequence_number <= ' + toAlias);
      }
      if (params.tidspunktfra) {
        var timeFromAlias = dbapi.addSqlParameter(query, params.tidspunktfra);
        dbapi.addWhereClause(query, 'h.time >=' + timeFromAlias);
      }

      if (params.tidspunkttil) {
        var timeToAlias = dbapi.addSqlParameter(query, params.tidspunkttil);
        dbapi.addWhereClause(query, 'h.time <=' + timeToAlias);
      }
      // we want to be able to find events for a specific ID.
      var keyColumns = _.reduce(columnMappings, function (memo, mapping) {
        memo[mapping.name] = {
          where: coaleseFields(mapping.name)
        };
        return memo;
      }, {});
      var propertyFilter = sqlParameterImpl.simplePropertyFilter(simpleFilterParameters, keyColumns);
      propertyFilter(query, params);
      var dbQuery = dbapi.createQuery(query);
      dbapi.streamRaw(client, dbQuery.sql, dbQuery.params, callback);
    }
  };
}
var sqlModels = _.reduce(datamodels, function(memo, datamodel) {
  var datamodelName = datamodel.name;
  var columnMappings = mappings.columnMappings[datamodelName];
  function selectFields() {
    return columnMappings.map(function(columnMapping) {
      var selectTransform = columnMapping.selectTransform;
      var columnName = columnMapping.column || columnMapping.name;
      var coalescedColumn = coaleseFields(columnName);
      var transformedColumn = selectTransform ? selectTransform(coalescedColumn) : coalescedColumn;
      return transformedColumn + ' AS ' + columnMapping.name;
    });
  }

  var baseQuery = function () {
    var query = {
      select: ['h.operation as operation', sqlUtil.selectIsoDateUtc('h.time') + ' as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectFields()),
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
  memo[datamodelName] = createSqlModel( mappings.columnMappings[datamodelName], parameters.keyParameters[datamodelName], baseQuery);
  return memo;
}, {});

module.exports = sqlModels;

var registry = require('../../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});