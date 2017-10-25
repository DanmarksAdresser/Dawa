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
    reverseGeocodingNearest: commonParameters.reverseGeocodingNearest
  },
  representations,
  sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
  nameAndKey, parameters.id, {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur
  },
  representations,
  sqlModel
);

Object.keys(exports).forEach(key => {
  registry.add('stednavn', 'resource', key, exports[key]);
});
