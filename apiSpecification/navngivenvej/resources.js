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


Object.keys(exports).forEach(key => {
  registry.add('navngivenvej', 'resource', key, exports[key]);
});
