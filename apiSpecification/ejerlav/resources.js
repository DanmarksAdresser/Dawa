"use strict";

const parameters = require('./parameters');
const nameAndKey = require('./nameAndKey');
const representations = require('./representations');
const sqlModel = require('./sqlModel');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const registry = require('../registry');

exports.query = resourcesUtil.queryResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    search: commonParameters.search,
    geomWithin: commonParameters.geomWithin,
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    reverseGeocoding: commonParameters.reverseGeocodingOptional
  },
  representations,
  sqlModel
);

exports.autocomplete = resourcesUtil.autocompleteResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    autocomplete: commonParameters.autocomplete,
    geomWithin: commonParameters.geomWithin,
    crs: commonParameters.crs
  },
  representations.autocomplete,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id,
  {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur
  },
  representations,
  sqlModel
);

Object.keys(exports).forEach(key => {
  registry.add('ejerlav', 'resource', key, exports[key]);
});
