"use strict";

var _ = require('underscore');
const { go } = require('ts-csp');
const cursorChannel = require('../../../util/cursor-channel');

var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
var sqlUtil = require('../../common/sql/sqlUtil');
var parameters = require('./parameters');
var querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
var temaer = require('../../temaer/temaer');

const selectClause = columnMappings =>
  columnMappings.map(function(columnMapping) {
    var selectTransform = columnMapping.selectTransform;
    var columnName = columnMapping.column || columnMapping.name;
    var transformedColumn = selectTransform ? selectTransform(columnName) : columnName;
    return transformedColumn + ' AS ' + columnMapping.name;
  });

function createSqlModel( columnMappings , simpleFilterParameters, baseQuery) {
  return {
    allSelectableFieldNames: function () {
      return ['sekvensnummer', 'operation', 'tidspunkt'].concat(_.pluck(columnMappings, 'name'));
    },
    validateParams: (client, params) => go(function*() {
      const senesteHaendelse = yield querySenesteSekvensnummer(client);
      if (params.sekvensnummertil && senesteHaendelse.sekvensnummer < params.sekvensnummertil) {
        throw new sqlUtil.InvalidParametersError("Hændelse med sekvensnummer " + params.sekvensnummertil + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
      }
    }),
    processStream: function (client, fieldNames, params, channel, options) {
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
      return cursorChannel(client, dbQuery.sql, dbQuery.params, channel, options);
    }
  };
}

function baseQuery(datamodelName, tableName, columnMappings) {

  var query = {
    select: ['h.operation as operation', sqlUtil.selectIsoDateUtc('h.time') + ' as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectClause(columnMappings)),
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

const baseQuery2 = (datamodelName, tableName, columnMappings) => {
  var query = {
    select: ['h.operation as operation', sqlUtil.selectIsoDateUtc('h.time') + ' as tidspunkt', 'h.sequence_number as sekvensnummer'].concat(selectClause(columnMappings)),
    from: [" transaction_history h" +
    " JOIN " + tableName + "_changes i ON h.sequence_number = i.changeid"],
    whereClauses: ['public', `h.entity = '${datamodelName}'`],
    orderClauses: ['changeid'],
    sqlParams: []
  };
  return query;
};

const oldSqlModelNames = ['jordstykketilknytning'];
const newSqlModelNames = ['ejerlav', 'postnummer','vejstykke', 'adgangsadresse', 'adresse', 'navngivenvej', 'vejstykkepostnummerrelation', 'stednavntilknytning'];

var oldSqlModels = oldSqlModelNames.reduce(function(memo, datamodelName) {
  var columnMappings = mappings.columnMappings[datamodelName];
  var baseQueryFn = function() {
    return baseQuery(datamodelName, mappings.tables[datamodelName], columnMappings);
  };

  memo[datamodelName] = createSqlModel( columnMappings, parameters.keyParameters[datamodelName], baseQueryFn);
  return memo;
}, {});

const newSqlModels = newSqlModelNames.reduce((memo, datamodelName) => {
  var columnMappings = mappings.columnMappings[datamodelName];
  var baseQueryFn = function() {
    return baseQuery2(datamodelName, mappings.tables[datamodelName], columnMappings);
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
const sqlModels = Object.assign({}, oldSqlModels, newSqlModels);

temaer.forEach(function(tema) {
  _.extend(sqlModels, createTilknytningModel(tema));
});


module.exports = sqlModels;

var registry = require('../../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});
