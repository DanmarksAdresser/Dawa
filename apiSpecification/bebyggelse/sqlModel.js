"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

const columns = {
  type: {
    column: 'undertype'
  },
  kode: {
    column: 'bebyggelseskode'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias);
    }
  }
};

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = () => ({
  select: [],
  from: ['stednavne'],
  whereClauses: [`hovedtype = 'Bebyggelse'`],
  orderClauses: [],
  sqlParams: []
});

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('bebyggelse', 'sqlModel', undefined, module.exports);
