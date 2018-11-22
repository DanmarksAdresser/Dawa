"use strict";

const parameters = require('./parameters');
const nameAndKey = require('./nameAndKey');
const representations = require('./representations');
const commonParameters = require('../common/commonParameters');
const sqlModel = require('./sqlModel');
const registry = require('../registry');
const resourcesUtil = require('../common/resourcesUtil');


exports.query = resourcesUtil.queryResourceSpec(
  nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    reverseGeocoding: commonParameters.reverseGeocodingOptional
  },
  representations,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id, {
    crs: commonParameters.crs
  },
  representations,
  sqlModel
);

Object.keys(exports).forEach(key => {
  registry.add('bebyggelse', 'resource', key, exports[key]);
});
