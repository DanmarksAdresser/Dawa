"use strict";

var _ = require('underscore');

var async = require('async');
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
      return transformed + ' AS "' + mapping.name + '"';
    }),
    from: [tableName + '_history'],
    whereClauses: [],
    orderClauses: keyColumns,
    sqlParams: []
  };
}

function createSqlModel(columnMappings, baseQueryFn) {
  return {
    allSelectableFields: function () {
      return _.pluck(columnMappings, 'name');
    },
    stream: function (client, fieldNames, params, callback) {
      async.waterfall([
        function (callback) {
          querySenesteSekvensnummer(client, callback);
        },
        function (senesteHaendelse, callback) {
          if (params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
            callback(new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer));
          }
          else {
            var sqlParts = baseQueryFn();
            if (params.sekvensnummer) {
              var sekvensnummerAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummer);
              dbapi.addWhereClause(sqlParts, '(valid_from <= ' + sekvensnummerAlias + ' OR valid_from IS NULL)');
              dbapi.addWhereClause(sqlParts, '(valid_to > ' + sekvensnummerAlias + ' OR valid_to IS NULL)');
            }
            else {
              dbapi.addWhereClause(sqlParts, 'valid_to IS NULL');
            }
            var query = dbapi.createQuery(sqlParts);
            dbapi.streamRaw(client, query.sql, query.params, callback);
          }
        }
      ], callback);
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