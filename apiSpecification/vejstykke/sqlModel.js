"use strict";

const dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestamp = sqlUtil.selectIsoDate;

var columns = {
  kode: {
    column: 'vejstykker.kode'
  },
  kommunekode: {
    column: 'vejstykker.kommunekode'
  },
  oprettet: {
    select: selectIsoTimestamp('vejstykker.oprettet')
  },
  ændret: {
    select: selectIsoTimestamp('vejstykker.aendret')
  },
  kommunenavn: {
    select: "k.navn",
    where: null
  },
  navn: {
    column: 'vejstykker.vejnavn'
  },
  postnr: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['vejstykkerpostnumremat'],
        whereClauses: ['postnr = nr'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'postnr',
        multi: true
      }], {});
      propertyFilterFn(subquery, {postnr: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  postnumre: {
    select: `(SELECT json_agg(CAST((p.nr, p.navn) AS PostnummerRef))
    FROM vejstykkerpostnumremat vp
    JOIN postnumre p ON vp.postnr = p.nr
    WHERE vp.kommunekode = vejstykker.kommunekode AND vp.vejkode = vejstykker.kode)`
  },
  tsv: {
    column: 'vejstykker.tsv'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
    }
  }
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.geomWithin('geom'),
  sqlParameterImpl.reverseGeocoding(),
  sqlParameterImpl.autocomplete(columns, ['navn']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: ['vejstykker' +
      " LEFT JOIN kommuner k ON vejstykker.kommunekode = k.kode" +
      ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
      ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
      ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('vejstykke', 'sqlModel', undefined, module.exports);
