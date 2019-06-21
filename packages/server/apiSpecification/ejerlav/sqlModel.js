"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const sqlUtil = require('../common/sql/sqlUtil');
const assembleSqlModel = sqlUtil.assembleSqlModel;
const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

const columns = Object.assign({
  kode: {
    column: 'ejerlav.kode'
  },
  navn: {
    column: 'ejerlav.navn'
  },
  tsv: {
    column: 'ejerlav.tsv'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'ejerlav.geom');
    }
  },
}, postgisSqlUtil.bboxVisualCenterColumns());

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.search(columns, ['navn']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = function() {
  return {
    select: [],
    from: ['ejerlav'],
    whereClauses: [],
    groupBy: '',
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

const registry = require('../registry');
registry.add('ejerlav', 'sqlModel', undefined, module.exports);