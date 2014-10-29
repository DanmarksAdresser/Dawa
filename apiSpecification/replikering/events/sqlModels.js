"use strict";

var _ = require('underscore');

var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
var sqlUtil = require('../../common/sql/sqlUtil');
var parameters = require('./parameters');
var temaer = require('../../temaer/temaer');

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
        var columnName = mapping.column || mapping.name;
        memo[mapping.name] = {
          where: columnName
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

function baseQuery(datamodelName, tableName, columnMappings) {
  function selectFields() {
    return columnMappings.map(function(columnMapping) {
      var selectTransform = columnMapping.selectTransform;
      var columnName = columnMapping.column || columnMapping.name;
      var transformedColumn = selectTransform ? selectTransform(columnName) : columnName;
      return transformedColumn + ' AS ' + columnMapping.name;
    });
  }

  var query = {
    select: ['h.operation as operation', sqlUtil.selectIsoDateUtc('h.time') + ' as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectFields()),
    from: [" transaction_history h" +
      " LEFT JOIN " + tableName + "_history i ON ((h.operation IN ('insert', 'update') AND h.sequence_number = i.valid_from) OR (h.operation = 'delete' AND h.sequence_number = i.valid_to))"],
    whereClauses: [],
    orderClauses: ['sekvensnummer'],
    sqlParams: []
  };
  var datamodelAlias = dbapi.addSqlParameter(query, datamodelName);
  dbapi.addWhereClause(query, "h.entity = " + datamodelAlias);
  return query;

}

var sqlModels = _.reduce(['vejstykke', 'adgangsadresse', 'adresse','postnummer','ejerlav'], function(memo, datamodelName) {
  var columnMappings = mappings.columnMappings[datamodelName];
  var baseQueryFn = function() {
    return baseQuery(datamodelName, mappings.tables[datamodelName], columnMappings);
  };

  memo[datamodelName] = createSqlModel( columnMappings, parameters.keyParameters[datamodelName], baseQueryFn);
  return memo;
}, {});

function createTilknytningModel(tema) {
  var sqlModelName = tema.prefix + 'tilknytning';
  var columnMappings = mappings.columnMappings[sqlModelName];

  var baseQueryFn = function() {
    var query = baseQuery('adgangsadresse_tema', 'adgangsadresser_temaer_matview', columnMappings);
    query.from.push('LEFT JOIN temaer ON temaer.id = tema_id');
    var temaNameAlias = dbapi.addSqlParameter(query, tema.singular);
    dbapi.addWhereClause(query, 'i.tema = ' + temaNameAlias);
    return query;
  };

  var result = {};
  result[tema.prefix + 'tilknytning'] = createSqlModel(columnMappings, parameters.keyParameters[sqlModelName], baseQueryFn);
  return result;
}

temaer.forEach(function(tema) {
  _.extend(sqlModels, createTilknytningModel(tema));
});

module.exports = sqlModels;

var registry = require('../../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});