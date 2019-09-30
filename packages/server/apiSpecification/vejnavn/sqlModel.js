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
        select: ["distinct vejnavn as navn"],
        from: ['navngivenvejkommunedel_mat nvk join vejstykkerpostnumremat vp on nvk.id = vp.navngivenvejkommunedel_id'],
        whereClauses: [],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'postnr',
        multi: true
      }], {});
      propertyFilterFn(subquery, {postnr: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.from.push('natural join (' + subquerySql + ') pnrs');
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
    select: "(SELECT json_agg(json_build_object('kode', kode, 'navn', navn)) from (select distinct on (k.kode) k.kode, k.navn FROM navngivenvejkommunedel_mat v join kommuner k on v.kommunekode = k.kode where v.vejnavn = vejnavne.navn) s)"
  },
  postnumre: {
    select: (sqlParts, columnSpec, params) => {
      // Desværre er tidligere releaset opførsel således, at postnumrene der returneres
      // er påvirket af en evt. kommunekodeparameter. Vi er derfor nødt til at holde bagudkompatibilitet,
      // således at de postnumre der returneres kun er dem som er angivet af kommunekode-parameteren.
      const subquery = {
        select: ["distinct on (p.nr) p.nr, p.navn"],
        from: ['navngivenvejkommunedel_mat v join vejstykkerpostnumremat  vp on v.id = vp.navngivenvejkommunedel_id join postnumre p on vp.postnr = p.nr'],
        whereClauses: [`v.vejnavn = vejnavne.navn`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'kommunekode',
        multi: true
      }], {kommunekode: {column: 'vp.kommunekode'}});
      if(params.kommunekode) {
        propertyFilterFn(subquery, {kommunekode: params.kommunekode});
      }
      const subquerySql = dbapi.createQuery(subquery).sql;
      return `(select json_agg(json_build_object('nr', nr, 'navn', navn)) FROM (${subquerySql}) s)`;
    }
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
