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
    crs: commonParameters.crs
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

exports.reverseGeocoding = resourcesUtil.reverseGeocodingResourceSpec(
  '/vejstykker/reverse',
  representations,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id,
  {
    crs: commonParameters.crs
  },
  representations,
  sqlModel
);

Object.keys(exports).forEach(key => {
  registry.add('vejstykke', 'resource', key, exports[key]);
});
