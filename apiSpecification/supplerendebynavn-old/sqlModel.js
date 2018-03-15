"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
const dbapi = require('../../dbapi');

var columns = {
  kommunekode: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['supplerendebynavn_kommune_mat'],
        whereClauses: ['supplerendebynavn = s.navn'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{name: 'kommunekode', multi: true}], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push(`EXISTS(${subquerySql})`);
    }
  },
  postnr: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['supplerendebynavn_postnr_mat'],
        whereClauses: ['supplerendebynavn = s.navn'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{name: 'postnr', multi: true}], {});
      propertyFilterFn(subquery, {postnr: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push(`EXISTS(${subquerySql})`);
    }
  },
  kommuner: {
    select: "(select json_agg(json_build_object('kode', sk.kommunekode, 'navn', k.navn)) from supplerendebynavn_kommune_mat sk join kommuner k on sk.kommunekode = k.kode where sk.supplerendebynavn = s.navn)"
  },
  postnumre: {
    select: `(select json_agg(json_build_object('nr', sp.postnr, 'navn', p.navn)) from supplerendebynavn_postnr_mat sp join postnumre p on sp.postnr = p.nr where sp.supplerendebynavn = s.navn)`
  },
  tsv: {
    column: 's.tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: [' supplerendebynavne_mat s'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('supplerendebynavn-old', 'sqlModel', undefined, module.exports);