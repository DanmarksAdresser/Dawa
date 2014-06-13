"use strict";

var _ = require('underscore');

var async = require('async');
var querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
var datamodels = require('../eventDatamodels');
var dbapi = require('../../../dbapi');
var mappings = require('./../columnMappings');
var registry = require('../../registry');
var sqlUtil = require('../../common/sql/sqlUtil');

var sqlModels = _.reduce(datamodels, function(memo, datamodel) {
  var datamodelName = datamodel.name;
  var columnNameMap = mappings.columnToFieldName[datamodelName];
  var baseQuery = function() {
    return {
      select: _.map(datamodel.columns, function(columnName) {
        return mappings.columnToSelect[datamodelName][columnName] + ' AS ' + columnNameMap[columnName];
      }),
      from: [datamodel.table + '_history'],
      whereClauses: [],
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
    stream: function(client, fieldNames, params, callback) {
      async.waterfall([
        function(callback) {
          querySenesteSekvensnummer(client, callback);
        },
        function(senesteHaendelse, callback) {
          console.log("seneste haendelse: " + JSON.stringify(senesteHaendelse));
          if(params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
            callback(new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer));
          }
          else {
            var sqlParts = baseQuery();
            if(params.sekvensnummer) {
              var sekvensnummerAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummer);
              dbapi.addWhereClause(sqlParts, '(valid_from <= ' + sekvensnummerAlias + ' OR VA');
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
  return memo;
}, {});

module.exports = sqlModels;

_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + 'udtraek', 'sqlModel', undefined, sqlModel);
});