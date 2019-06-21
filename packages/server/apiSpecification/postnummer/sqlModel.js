"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

const columns = Object.assign({
  kommunekode: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['postnumre_kommunekoder_mat'],
        whereClauses: ['postnr = nr'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{name: 'kommunekode', multi: true}], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  stormodtageradresser: {
    select: '(select json_agg(adgangsadresseid) from stormodtagere where stormodtagere.nr = postnumre.nr)'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'geom');
    }
  },
  kommuner: {
    select: `CASE WHEN not stormodtager THEN (select json_agg((kommunekode, kommuner.navn)::kommuneref order by kommunekode)
       from postnumre_kommunekoder_mat
       left join kommuner on postnumre_kommunekoder_mat.kommunekode = kommuner.kode
       where  postnr = nr) ELSE
    (select json_agg((kode, navn)::kommuneref order by kode)
    from (select distinct kommunekode as kode, k.navn from adgangsadresser_mat a join stormodtagere s on s.adgangsadresseid = a.id  join kommuner k on a.kommunekode = k.kode where s.nr = postnumre.nr) komm) END`
  },
  tsv: {
    column: 'tsv'
  }
}, postgisSqlUtil.bboxVisualCenterColumns());

const baseQuery = function (fieldNames, params) {
  const dagiPostnummerTable = params.landpostnumre ? 'landpostnumre' : 'dagi_postnumre';
  const query = {
    select: [],
    from: [`postnumre natural left join (select nr, ændret, geo_ændret, geo_version, visueltcenter, bbox, geom from ${dagiPostnummerTable}) dp
    natural left join (select nr, dagi_id from dagi_postnumre) dp2`],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  return query;
};


const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.postnummerStormodtagerFilter(),
  sqlParameterImpl.geomWithin('geom'),
  sqlParameterImpl.reverseGeocodingWithin('geom'),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key, true)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('postnummer', 'sqlModel', undefined, module.exports);
