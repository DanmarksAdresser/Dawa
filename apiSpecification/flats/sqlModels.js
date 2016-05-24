"use strict";

const _ = require('underscore');

const flats = require('./flats');
const sqlSpecs = require('./sqlSpecs');
const sqlUtil = require('../common/sql/sqlUtil');
const parametersMap = require('./parameters');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');

module.exports = _.mapObject(flats, (flat, flatName) => {
  const sqlSpec = sqlSpecs[flatName];
  const columnSpec = sqlSpec.columns;
  const table = sqlSpec.table;
  const geometryType = flat.geometryType;
  const searchable = flat.searchable;
  const baseQuery = function () {
    return {
      select: [],
      from: [table],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  };

  const columns = flat.fields.map(field => {
    return {
      name: field.name
    }
  });
  const parameters = parametersMap[flatName];
  console.dir(parameters);
  console.dir(parameters.propertyFilter);
  const propertyFilterParameterImpl = sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns);
  return sqlUtil.assembleSqlModel(columns, [propertyFilterParameterImpl], baseQuery);
});
