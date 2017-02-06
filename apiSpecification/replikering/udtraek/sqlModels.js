"use strict";

var _ = require('underscore');

const { go } = require('ts-csp');
const cursorChannel = require('../../../util/cursor-channel');

var querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var registry = require('../../registry');
var sqlUtil = require('../../common/sql/sqlUtil');
var temaer = require('../../temaer/temaer');

function baseQuery(tableName, columnMappings, keyColumns) {
  return {
    select: _.map(columnMappings, function(mapping) {
      var columnName = mapping.column || mapping.name;
      var transformed = (mapping.selectTransform || _.identity)(columnName);
      return transformed + ' AS ' + mapping.name;
    }),
    from: [tableName + '_history'],
    whereClauses: [],
    orderClauses: keyColumns,
    sqlParams: []
  };
}

function createSqlModel(columnMappings, baseQueryFn) {
  return {
    allSelectableFieldNames: function () {
      return _.pluck(columnMappings, 'name');
    },
    validateParams: (client, params) => go(function*() {
      const senesteHaendelse = yield querySenesteSekvensnummer(client);
      if (params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
        throw new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
      }
    }),
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = baseQueryFn();
      if (params.sekvensnummer) {
        const sekvensnummerAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummer);
        dbapi.addWhereClause(sqlParts, '(valid_from <= ' + sekvensnummerAlias + ' OR valid_from IS NULL)');
        dbapi.addWhereClause(sqlParts, '(valid_to > ' + sekvensnummerAlias + ' OR valid_to IS NULL)');
      }
      else {
        dbapi.addWhereClause(sqlParts, 'valid_to IS NULL');
      }
      var query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };
}
var sqlModels = _.reduce(mappings.columnMappings, function(memo, columnMappings, datamodelName) {
  var baseQueryFn = function() {
    return baseQuery(mappings.tables[datamodelName], columnMappings, mappings.keys[datamodelName]);
  };
  memo[datamodelName] = createSqlModel(columnMappings, baseQueryFn);
  return memo;
}, {});

var tilknytningModels = _.reduce(temaer, function(memo, tema) {
  var name = tema.prefix + 'tilknytning';
  var columnMappings = mappings.columnMappings[name];

  var baseQueryFn = function() {
    var query = baseQuery('adgangsadresser_temaer_matview',
      columnMappings,
      _.pluck(columnMappings, 'name'));
    query.from.push('JOIN temaer ON temaer.id = tema_id');
    query.orderClauses=['adgangsadresse_id, tema_id'];
    var temaAlias = dbapi.addSqlParameter(query, tema.singular);
    dbapi.addWhereClause(query, 'adgangsadresser_temaer_matview_history.tema = ' + temaAlias);
    return query;
  };
  memo[name] = createSqlModel(columnMappings, baseQueryFn);
  return memo;
}, {});

_.extend(sqlModels, tilknytningModels);
module.exports = sqlModels;

_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + 'udtraek', 'sqlModel', undefined, sqlModel);
});
