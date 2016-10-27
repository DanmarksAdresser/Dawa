"use strict";

const _ = require('underscore');

const commonParameters = require('../common/commonParameters');
const flats = require('./flats');
const parametersMap = require('./parameters');
const registry = require('../registry');
const representationsMap = require('./representations');
const resourcesUtil = require('../common/resourcesUtil');
const sqlModels = require('./sqlModels');

module.exports = _.mapObject(flats, (flat => {
  const representations = representationsMap[flat.singular];
  const sqlModel = sqlModels[flat.singular];
  const parameters = parametersMap[flat.singular];
  const queryParams = {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    reverseGeocoding: commonParameters.reverseGeocodingOptional
  };
  if(flat.structuredJsonRepresentation) {
    queryParams.struktur = commonParameters.struktur
  }
  const queryResource = resourcesUtil.queryResourceSpec(flat, queryParams, representations, sqlModel);
  const getByKeyResource = resourcesUtil.getByKeyResourceSpec(flat, parameters.id, {
    crs: commonParameters.crs
  }, representations, sqlModel);

  const resources= {
    query: queryResource,
    getByKey: getByKeyResource
  };
  if(flat.legacyReverseResource) {
    resources.reverseGeocoding = resourcesUtil.reverseGeocodingResourceSpec('/' + flat.plural + '/reverse', representations, sqlModel)
  }
  return resources;
}));

_.mapObject(module.exports, (resources, entityName) => {
  _.mapObject(resources, (resource, qualifier) => {
    registry.add(entityName, 'resource', qualifier, resource);
  });
});
