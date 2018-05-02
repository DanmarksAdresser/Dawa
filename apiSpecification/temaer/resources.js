"use strict";

const temaModels = require('../../dagiImport/temaModels');
const parameters = require('./parameters');
const namesAndKeys = require('./namesAndKeys');
const representationsMap = require('./representations');
const sqlModels = require('./sqlModels');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const registry = require('../registry');
const _ = require('underscore');


temaModels.modelList.filter(model => model.published).forEach(model => {
  const nameAndKey = namesAndKeys[model.singular];
  const sqlModel = sqlModels[model.singular];
  const representations = representationsMap[model.singular];
  const queryParams = {
    propertyFilter: parameters[model.singular].propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    struktur: commonParameters.struktur
  };
  if (model.searchable) {
    queryParams.search = commonParameters.search
  }

  queryParams.reverseGeocoding = commonParameters.reverseGeocodingOptional;
  queryParams.reverseGeocodingNearest = commonParameters.reverseGeocodingNearest;
  const path = model.path || `/${nameAndKey.plural}`;
  let resources = [
    resourcesUtil.queryResourcePathSpec(
      path,
      queryParams,
      representations,
      sqlModel)];
  if (model.searchable) {
    resources.push(resourcesUtil.autocompleteResourcePathSpec(`${path}/autocomplete`, {
      propertyFilter: parameters[model.singular].propertyFilter,
      autocomplete: commonParameters.autocomplete
    }, representations.autocomplete, sqlModel));
  }
  const getByKeyParams = {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur
  };

  resources = resources.concat([
    resourcesUtil.reverseGeocodingResourceSpec(`${path}/reverse`, representations, sqlModel),
    resourcesUtil.getByKeyResourcePathSpec(path, nameAndKey, parameters[model.singular].id, getByKeyParams, representations, sqlModel)
  ]);
  exports[model.singular] = resources;

  const qualifiers = ['query'].concat(model.searchable ? ['autocomplete'] : []).concat(['reverseGeocoding', 'getByKey']);
  _.zip(qualifiers, resources).forEach(function (pair) {
    registry.add(model.singular, 'resource', pair[0], pair[1]);
  });
});
