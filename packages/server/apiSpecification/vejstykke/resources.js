"use strict";

const commonParameters = require('../common/commonParameters');
var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
const registry = require('../registry');
var resourcesUtil = require('../common/resourcesUtil');



exports.query = resourcesUtil.queryResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    search: commonParameters.search,
    geomWithin: commonParameters.geomWithin,
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    fuzzy: commonParameters.fuzzy,
    regex: parameters.regex,
    includeDeleted: commonParameters.includeDeleted
  },
  representations,
  sqlModel
);

exports.autocomplete = resourcesUtil.autocompleteResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    autocomplete: commonParameters.autocomplete,
    geomWithin: commonParameters.geomWithin,
    crs: commonParameters.crs,
    fuzzy: commonParameters.fuzzy,
    regex: parameters.regex,
    includeDeleted: commonParameters.includeDeleted
  },
  representations.autocomplete,
  sqlModel
);

exports.reverseGeocoding = resourcesUtil.reverseGeocodingResourceSpec(
  '/vejstykker/reverse',
  representations,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id,
  {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    includeDeleted: commonParameters.includeDeleted
  },
  representations,
  sqlModel
);

exports.neighbors = {
  path: `/${nameAndKey.plural}/:kommunekode/:kode/naboer`,
  pathParameters: parameters.id,
  queryParameters: resourcesUtil.flattenParameters({
    paging: commonParameters.paging,
    format: commonParameters.format,
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    distance: parameters.distance
  }),
  representations: representations,
  sqlModel: sqlModel,
  singleResult: false,
  chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
  processParameters: (params) => {
    params.neighborkommunekode=params.kommunekode;
    delete params.kommunekode;

    params.neighborkode=params.kode;
    delete params.kode;
    resourcesUtil.applyDefaultPaging(params)
  }
};

Object.keys(exports).forEach(key => {
  registry.add('vejstykke', 'resource', key, exports[key]);
});
