"use strict";

const dbapi = require('../../dbapi');
const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const sqlUtil = require('../common/sql/sqlUtil')

const assembleSqlModel = sqlUtil.assembleSqlModel;

const columns = {
  postnr: {
    select: null,
    where: function (sqlParts, parameterArray) {
      const subquery = {
        select: ["*"],
        from: ['navngivenvejkommunedel_mat nvk join vejstykkerpostnumremat vp on nvk.id = vp.navngivenvejkommunedel_id'],
        whereClauses: [`nvk.vejnavn = vejnavne.navn`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'postnr',
        multi: true
      }], {});
      propertyFilterFn(subquery, {postnr: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  kommunekode: {
    select: null,
    where: function (sqlParts, parameterArray) {
      const subquery = {
        select: ["*"],
        from: ['navngivenvejkommunedel_mat nvk'],
        whereClauses: [`nvk.vejnavn = vejnavne.navn`],
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
  },
  kommuner: {
    select: "(SELECT json_agg(json_build_object('kode', k.kode, 'navn', k.navn)) from navngivenvejkommunedel_mat v join kommuner k on v.kommunekode = k.kode where v.vejnavn = vejnavne.navn)"
  },
  postnumre: {
    select: `(SELECT json_agg(json_build_object('nr', p.nr, 'navn', p.navn)) 
    from navngivenvejkommunedel_mat v join vejstykkerpostnumremat  vp on v.id = vp.navngivenvejkommunedel_id join postnumre p on vp.postnr = p.nr where v.vejnavn = vejnavne.navn)`
  }
};

function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    const fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push(`vejnavne.navn IN (select navn from vejnavne_mat order by navn <-> ${fuzzyqAlias} limit 100)`);
    sqlParts.orderClauses.push(`levenshtein(lower(vejnavne.navn), lower(${fuzzyqAlias}), 2, 1, 3)`);
  }
}

const vejnavneGeomWithin = (sqlParts, params) => {
  if(params.polygon || params.cirkel) {
    const subquery = {
      select: ["*"],
      from: ['navngivenvejkommunedel_mat nvk'],
      whereClauses: [`nvk.vejnavn = vejnavne.navn`],
      orderClauses: [],
      sqlParams: sqlParts.sqlParams
    };
    const geomWithin = sqlParameterImpl.geomWithin();
    geomWithin(subquery, params);
    const subquerySql = dbapi.createQuery(subquery).sql;
    sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
  }
};


const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  vejnavneGeomWithin,
  sqlParameterImpl.search(columns, ['navn']),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = function() {
  return {
    select: [],
    from: [
      'vejnavne_mat vejnavne'
    ],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};



const sqlModel = assembleSqlModel(columns, parameterImpls, baseQuery);

module.exports = sqlUtil.applyFallbackToFuzzySearch(sqlModel);

const registry = require('../registry');
registry.add('vejnavn', 'sqlModel', undefined, module.exports);
