"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

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
        from: ['stednavn_kommune'],
        whereClauses: ['stednavne.id  = stednavn_kommune.stednavn_id'],
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
     FROM stednavn_kommune sk
     JOIN kommuner k
     ON sk.kommunekode = k.kode
     WHERE sk.stednavn_id = stednavne.id)`
  }
};

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = () => ({
    select: [],
    from: ['stednavne'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  });

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('stednavn', 'sqlModel', undefined, module.exports);
