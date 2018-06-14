"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

const normalGeomQuery = "(select geom from dagi_postnumre where dagi_postnumre.nr = postnumre.nr limit 1)";
const landpostnummerGeomQuery = "(select geom from landpostnumre where landpostnumre.nr = postnumre.nr limit 1)";

const normalBboxQuery = "(select bbox from dagi_postnumre where dagi_postnumre.nr = postnumre.nr limit 1)";
const landpostnummerBboxQuery = "(select bbox from landpostnumre where landpostnumre.nr = postnumre.nr limit 1)";

const geomQueryFunc = params =>  params.landpostnumre ? landpostnummerGeomQuery : normalGeomQuery;
const bboxQueryFunc = params =>  params.landpostnumre ? landpostnummerBboxQuery : normalBboxQuery;
const columns = {
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
  bbox: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.bboxColumn(params.srid || 4326, sridAlias,bboxQueryFunc(params));
    }
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias,geomQueryFunc(params));
    }
  },
  kommuner: {
    select: "(select json_agg((kommunekode, kommuner.navn)::kommuneref order by kommunekode)" +
      " from postnumre_kommunekoder_mat" +
      " left join kommuner on postnumre_kommunekoder_mat.kommunekode = kommuner.kode" +
      " where  postnr = nr)"
  },
  tsv: {
    column: 'tsv'
  }
};

const baseQuery = function () {
  return {
    select: [],
    from: ['postnumre'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};


const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.postnummerStormodtagerFilter(),
  sqlParameterImpl.geomWithin(geomQueryFunc),
  sqlParameterImpl.reverseGeocodingWithin(geomQueryFunc),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key, true)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('postnummer', 'sqlModel', undefined, module.exports);
