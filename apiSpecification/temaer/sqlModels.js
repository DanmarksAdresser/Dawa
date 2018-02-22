"use strict";

const temaModels = require('../../dagiImport/temaModels');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const sqlUtil = require('../common/sql/sqlUtil');
const assembleSqlModel = sqlUtil.assembleSqlModel;
const selectIsoTimestampUtc = sqlUtil.selectIsoDateUtc;
const dbapi = require('../../dbapi');
const registry = require('../registry');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

temaModels.modelList.filter(model => model.published).forEach(model => {
  const columns = {
    geom_json: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias);
      }
    },
    ændret: {
      column: selectIsoTimestampUtc('ændret')
    },
    geo_ændret: {
      select: selectIsoTimestampUtc('geo_ændret')
    }
  };

  const baseQuery = function() {
    return {
      select: [],
      from: [model.table],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  };

  const parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters[model.singular].propertyFilter, columns),
    sqlParameterImpl.reverseGeocodingWithin(),
    sqlParameterImpl.geomWithin(),
    sqlParameterImpl.search(columns),
    sqlParameterImpl.autocomplete(columns),
    sqlParameterImpl.paging(columns, model.primaryKey, true)
  ];

  exports[model.singular] = assembleSqlModel(columns, parameterImpls, baseQuery);

  registry.add(model.singular, 'sqlModel', undefined, exports[model.singular]);
});
