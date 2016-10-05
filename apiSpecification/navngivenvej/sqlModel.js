"use strict";

const dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
const registry = require('../registry');
var sqlUtil = require('../common/sql/sqlUtil');

const assembleSqlModel = sqlUtil.assembleSqlModel;
const selectIsoTimestamp = sqlUtil.selectIsoDate;

var columns = {
  oprettet: {
    select: selectIsoTimestamp('oprettet')
  },
  ændret: {
    select: selectIsoTimestamp('ændret')
  },
  vejstykker: {
    select: `(SELECT json_agg(CAST((v.kommunekode, v.kode) AS VejstykkeRef))
    FROM vejstykker v
    WHERE v.navngivenvej_id = navngivenvej.id)`
  }
};

const regexParameterImpl = (sqlParts, params) => {
  if(params.regex) {
    const regexAlias = dbapi.addSqlParameter(sqlParts, params.regex);
    dbapi.addWhereClause(sqlParts, `navn ~ ${regexAlias}`);
  }
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  regexParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: ['navngivenvej'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

registry.add('navngivenvej', 'sqlModel', undefined, module.exports);
