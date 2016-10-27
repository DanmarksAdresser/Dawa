"use strict";

const _ = require('underscore');

const dbapi = require('../../dbapi');
const flats = require('./flats');
const sqlSpecs = require('./sqlSpecs');
const sqlUtil = require('../common/sql/sqlUtil');
const parametersMap = require('./parameters');
const registry = require('../registry');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');

module.exports = _.mapObject(flats, (flat, flatName) => {
  const sqlSpec = sqlSpecs[flatName];
  const columnSpec = sqlSpec.columns;

  const columns = flat.fields.reduce((memo, field) => {
    if(columnSpec[field.name]) {
      memo[field.name] = columnSpec[field.name];
    }
    else {
      memo[field.name] = {
        column: field.name
      }
    }
    return memo;
  }, {});
  columns.geom_json = {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '::integer))';
    }
  };

  const table = sqlSpec.table;
  const baseQuery = function () {
    return {
      select: [],
      from: [table],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  };

  const parameters = parametersMap[flatName];
  const sqlParameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
    sqlParameterImpl.reverseGeocodingWithin(),
    sqlParameterImpl.geomWithin(),
    sqlParameterImpl.paging(columns, flat.key, true)

  ];
  const sqlModel =  sqlUtil.assembleSqlModel(columns, sqlParameterImpls, baseQuery);
  registry.add(flatName, 'sqlModel', undefined, sqlModel);
  return sqlModel;
});
