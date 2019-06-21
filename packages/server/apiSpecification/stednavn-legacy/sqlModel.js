"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
const { applyFallbackToFuzzySearch }= require('../common/sql/sqlUtil')

const columns = {
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias);
    }
  },
  visueltcenter: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },
  visueltcenter_x: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.selectX(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },
  visueltcenter_y: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.selectY(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },

  kommunekode: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['sted_kommune'],
        whereClauses: ['stednavne.stedid  = sted_kommune.stedid'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'kommunekode',
        multi: true
      }], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push(`EXISTS(${subquerySql})`);
    }
  },
  kommuner: {
    select: `(select json_agg((kode, navn)::kommuneref order by kode) 
     FROM sted_kommune sk
     JOIN kommuner k
     ON sk.kommunekode = k.kode
     WHERE sk.stedid = steder.id)`
  }
};
const fuzzySearchParameterImpl = (sqlParts, params) => {
  if(params.fuzzyq) {
    const fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("stednavne.navn IN (select distinct ON (navn, dist) navn from (SELECT navn, navn <-> " + fuzzyqAlias + " as dist from stednavne ORDER BY dist LIMIT 1000) as v order by v.dist limit 100)");
    sqlParts.orderClauses.push(`levenshtein(lower(stednavne.navn), lower(${fuzzyqAlias}), 2, 1, 3)`);
  }
}

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.reverseGeocoding('geom', true),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.search(columns, ['navn']),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = () => ({
    select: [],
    from: [`stednavne join steder on stednavne.stedid = steder.id`],
    whereClauses: [`stednavne.brugsprioritet='primær'`],
    orderClauses: [],
    sqlParams: []
  });

const sqlModel = assembleSqlModel(columns, parameterImpls, baseQuery);
module.exports = applyFallbackToFuzzySearch(sqlModel);

const registry = require('../registry');
registry.add('stednavn-legacy', 'sqlModel', undefined, module.exports);
