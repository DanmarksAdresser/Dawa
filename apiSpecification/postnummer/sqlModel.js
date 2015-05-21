"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
var dbapi = require('../../dbapi');

var geomQuery = "(select geom from temaer where tema = 'postnummer' and (fields->>'nr')::integer = nr limit 1)";

var columns = {
  kommunekode: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['postnumre_kommunekoder_mat'],
        whereClauses: ['postnr = nr'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{name: 'kommunekode', multi: true}], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  stormodtageradresser: {
    select: '(select json_agg(adgangsadresseid) from stormodtagere where stormodtagere.nr = postnumre.nr)'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(' + geomQuery + ',' + sridAlias + '))';
    }
  },
  kommuner: {
    select: "(select json_agg((kommunekode, temaer.fields->>'navn')::kommuneref order by kommunekode)" +
      " from postnumre_kommunekoder_mat" +
      " left join temaer on postnumre_kommunekoder_mat.kommunekode = (temaer.fields->>'kode')::integer and temaer.tema = 'kommune'" +
      " where  postnr = nr)"
  },
  tsv: {
    column: 'tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: ['postnumre'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};


var geomQuery = "(select geom from temaer where tema = 'postnummer' and (fields->>'nr')::integer = nr limit 1)";
var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.postnummerStormodtagerFilter(),
  sqlParameterImpl.geomWithin(geomQuery),
  sqlParameterImpl.reverseGeocodingWithin(geomQuery),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key, true)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('postnummer', 'sqlModel', undefined, module.exports);
