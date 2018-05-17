"use strict";

const dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
const registry = require('../registry');
var sqlUtil = require('../common/sql/sqlUtil');

const assembleSqlModel = sqlUtil.assembleSqlModel;
const selectIsoTimestamp = sqlUtil.selectIsoDateUtc;

var columns = {
  oprettet: {
    select: selectIsoTimestamp('oprettet')
  },
  ændret: {
    select: selectIsoTimestamp('ændret')
  },
  beliggenhed_oprindelse_registrering: {
    select: selectIsoTimestamp('beliggenhed_oprindelse_registrering')
  },
  vejstykker: {
    select: `(SELECT json_agg(CAST((v.kommunekode, v.kode) AS VejstykkeRef))
    FROM vejstykker v
    WHERE v.navngivenvej_id = nv.id)`
  },
  administrerendekommunekode: {
    column: 'administrerendekommune'
  },
  administrerendekommunenavn: {
    select: `(select navn from kommuner k where k.kode = nv.administrerendekommune)`
  },
  kommunekode: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['vejstykker'],
        whereClauses: ['navngivenvej_id = nv.id'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'kommunekode',
        multi: true
      }], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
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
    from: ['navngivenvej nv'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

registry.add('navngivenvej', 'sqlModel', undefined, module.exports);
