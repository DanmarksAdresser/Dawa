"use strict";

const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');
const { applyFallbackToFuzzySearch }= require('../common/sql/sqlUtil')
const columns = require('./columns');
const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.reverseGeocoding('geom', true),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = () => ({
  select: [],
  from: [`steder join stednavne p_stednavn on steder.id = p_stednavn.stedid and p_stednavn.brugsprioritet = 'primær'`],
  whereClauses: [],
  orderClauses: [],
  sqlParams: []
});

const sqlModel = assembleSqlModel(columns, parameterImpls, baseQuery);
module.exports = applyFallbackToFuzzySearch(sqlModel);

const registry = require('../registry');
registry.add('sted', 'sqlModel', undefined, module.exports);
