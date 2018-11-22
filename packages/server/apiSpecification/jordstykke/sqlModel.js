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
};

Object.assign(columns, postgisSqlUtil.bboxVisualCenterColumns());


const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.reverseGeocoding('geom', true),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.search(columns, ['ejerlavkode', 'matrikelnr']),
  sqlParameterImpl.autocomplete(columns, ['ejerlavkode', 'matrikelnr']),
  sqlParameterImpl.paging(columns, ['ejerlavkode', 'matrikelnr'])
];

const baseQuery = () => ({
  select: [],
  from: [`jordstykker 
  natural left join (select kode as kommunekode, navn as kommunenavn from kommuner) k
  natural left join (select kode as regionskode, navn as regionsnavn from regioner) r
  natural left join (select kode as sognekode, navn as sognenavn from sogne) s
  natural left join (select kode as retskredskode, navn as retskredsnavn from retskredse) rk`],
  whereClauses: [],
  orderClauses: [],
  sqlParams: []
});

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('jordstykke', 'sqlModel', undefined, module.exports);
