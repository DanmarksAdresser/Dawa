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

const selectClause = columnMappings =>
  _.map(columnMappings, function (mapping) {
    var columnName = mapping.column || mapping.name;
    var transformed = (mapping.selectTransform || _.identity)(columnName);
    return transformed + ' AS ' + mapping.name;
  });

function baseQuery(tableName, columnMappings, keyColumns) {
  return {
    select: selectClause(columnMappings),
    from: [tableName + '_history'],
    whereClauses: [],
    orderClauses: keyColumns,
    sqlParams: []
  };
}

const validateParams = (client, params) => go(function*() {
  const senesteHaendelse = yield querySenesteSekvensnummer(client);
  if (params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
    throw new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
  }
});

const baseQuery2 = (tableName, keyColumns, columnMappings, sequenceNumber) => {
  let subselect =
    `SELECT *, row_number()
  OVER (PARTITION BY ${keyColumns.join(', ')}
    ORDER BY changeid desc NULLS LAST) as row_num
FROM ${tableName}_changes`;
  if(sequenceNumber) {
    subselect += ` WHERE (changeid IS NULL OR changeid <= $1)`
  }
  const baseQuery = {
    select: selectClause(columnMappings),
    from: [`(${subselect}) t`],
    whereClauses: ['row_num = 1 ', `operation <> 'delete'`],
    groupBy: '',
    orderClauses: [],
    sqlParams: []
  };
  if(sequenceNumber) {
    baseQuery.sqlParams.push(sequenceNumber);
  }
  return baseQuery;
};

const createSqlModel2 = (columnMappings, baseQueryFn) => {
  return {
    allSelectableFieldNames: function () {
      return _.pluck(columnMappings, 'name');
    },
    validateParams: validateParams,
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = baseQueryFn(params.sekvensnummer);
      const query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };
};

function createSqlModel(columnMappings, baseQueryFn) {
  return {
    allSelectableFieldNames: function () {
      return _.pluck(columnMappings, 'name');
    },
    validateParams: validateParams,
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

const newModelNames = ['ejerlav', 'postnummer', 'vejstykke', 'adgangsadresse', 'adresse', 'vejstykkepostnummerrelation', 'stednavntilknytning'];
const oldModelNames = _.difference(Object.keys(mappings.columnMappings), newModelNames);

var oldSqlModels = oldModelNames.reduce(function(memo, datamodelName) {
  const columnMappings = mappings.columnMappings[datamodelName];
  var baseQueryFn = function() {
    return baseQuery(mappings.tables[datamodelName], columnMappings, mappings.keys[datamodelName]);
  };
  memo[datamodelName] = createSqlModel(columnMappings, baseQueryFn);
  return memo;
}, {});

const newSqlModels = newModelNames.reduce((memo, datamodelName) => {
  const columnMappings = mappings.columnMappings[datamodelName];
  const baseQueryFn = (sequenceNumber) => baseQuery2(
    mappings.tables[datamodelName],
    mappings.keys[datamodelName],
    columnMappings,
    sequenceNumber
  );
  memo[datamodelName] = createSqlModel2(columnMappings, baseQueryFn);
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

const allSqlModels = Object.assign({}, oldSqlModels, tilknytningModels, newSqlModels);
module.exports = allSqlModels;

_.each(allSqlModels, function(sqlModel, key) {
  registry.add(key + 'udtraek', 'sqlModel', undefined, sqlModel);
});
