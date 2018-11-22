"use strict";

const parameters = require('./parameters');
const nameAndKey = require('./nameAndKey');
const representations = require('./representations');
const sqlModel = require('./sqlModel');
const registry = require('../registry');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');


exports.query = resourcesUtil.queryResourcePathSpec(
  '/stednavne2', {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    reverseGeocoding: commonParameters.reverseGeocodingOptional,
    struktur: commonParameters.struktur,
    search: commonParameters.search,
    reverseGeocodingNearest: commonParameters.reverseGeocodingNearest,
    fuzzy: commonParameters.fuzzy
  },
  representations,
  sqlModel
);

exports.autocomplete =   resourcesUtil.autocompleteResourcePathSpec('/stednavne2/autocomplete', {
    propertyFilter: parameters.propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin,
    struktur: commonParameters.struktur,
    autocomplete: commonParameters.autocomplete,
    fuzzy: commonParameters.fuzzy
  },
  representations.json,
  sqlModel);

exports.getByKey = resourcesUtil.getByKeyResourcePathSpec(
  '/stednavne2',
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
