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
    geometri: parameters.geometri
  },
  representations,
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

Object.keys(exports).forEach(key => {
  registry.add('navngivenvej', 'resource', key, exports[key]);
});
