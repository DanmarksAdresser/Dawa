"use strict";

var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
const registry = require('../registry');
var resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');



exports.query = resourcesUtil.queryResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    struktur: commonParameters.struktur,
    regex: parameters.regex,
    crs: commonParameters.crs,
    geometri: parameters.geometri,
    search: commonParameters.search,
    fuzzy: commonParameters.fuzzy,
    geomWithin: commonParameters.geomWithin
  },
  representations,
  sqlModel
);

exports.autocomplete = resourcesUtil.autocompleteResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    autocomplete: commonParameters.autocomplete,
    crs: commonParameters.crs,
    fuzzy: commonParameters.fuzzy,
    regex: parameters.regex
  },
  representations.autocomplete,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id,{
    struktur: commonParameters.struktur,
    crs: commonParameters.crs,
    geometri: parameters.geometri
  },
  representations,
  sqlModel
);

exports.neighbors = {
  path: `/${nameAndKey.plural}/:id/naboer`,
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
    params.neighborid=params.id;
    delete params.id;
    resourcesUtil.applyDefaultPagingForQuery(params)
  }
};


Object.keys(exports).forEach(key => {
  registry.add('navngivenvej', 'resource', key, exports[key]);
});
