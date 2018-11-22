"use strict";

const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');

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
  adgangsadresser: {
    select: `(select json_agg(json_build_object('id', a.id, 'vejnavn', a.vejnavn, 'husnr', formatHusnr(a.husnr), 'supplerendebynavn', a.supplerendebynavn, 'postnr', a.postnr, 'postnrnavn', a.postnrnavn)) from dar1_husnummer_current hn join adgangsadresser_mat a on hn.id = a.id where hn.fk_geodk_bygning_geodanmarkbygning = bygninger.id)`
  },
  adgangsadresseid: {
    where: (sqlParts, parameterArray) => {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['bygningtilknytninger bt'],
        whereClauses: [`bygninger.id = bt.bygningid`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'adgangsadresseid',
        multi: true
      }], {});
      propertyFilterFn(subquery, {adgangsadresseid: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  kommunekode: {
    where: (sqlParts, parameterArray) => {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['bygning_kommune bk'],
        whereClauses: [`bygninger.id = bk.bygningid`],
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
    select: `(select json_agg(json_build_object('kode', bk.kommunekode, 'navn', k.navn)) from bygning_kommune bk join kommuner k on bk.kommunekode = k.kode where bk.bygningid = bygninger.id)`
  }
};

Object.assign(columns, postgisSqlUtil.bboxVisualCenterColumns());


const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.reverseGeocoding('geom', true),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.paging(columns, ['id'])
];

const baseQuery = () => ({
  select: [],
  from: [`bygninger`],
  whereClauses: [],
  orderClauses: [],
  sqlParams: []
});

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('bygning', 'sqlModel', undefined, module.exports);
