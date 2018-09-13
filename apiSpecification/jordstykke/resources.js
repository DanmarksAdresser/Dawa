"use strict";

const parameters = require('./parameters');
const nameAndKey = require('./nameAndKey');
const representations = require('./representations');
const sqlModel = require('./sqlModel');
const registry = require('../registry');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');


exports.query = resourcesUtil.queryResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    reverseGeocoding: commonParameters.reverseGeocodingOptional,
    struktur: commonParameters.struktur,
    search: commonParameters.search,
  },
  representations,
  sqlModel
);

exports.autocomplete =   resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    autocomplete: commonParameters.autocomplete
  },
  representations.autocomplete,
  sqlModel);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id, {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur
  },
  representations,
  sqlModel
);

exports.reverse =resourcesUtil.reverseGeocodingResourceSpec(
  '/jordstykker/reverse',
  representations,
  sqlModel);

Object.keys(exports).forEach(key => {
  registry.add('jordstykke', 'resource', key, exports[key]);
});
