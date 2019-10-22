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
        struktur: commonParameters.struktur,
        crs: commonParameters.crs,
        search: commonParameters.search,
        fuzzy: commonParameters.fuzzy,
        geomWithin: commonParameters.geomWithin,
        reverseGeocodingOptional: commonParameters.reverseGeocodingOptional
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
        geomWithin: commonParameters.geomWithin,
        reverseGeocodingOptional: commonParameters.reverseGeocodingOptional
    },
    representations.autocomplete,
    sqlModel
);

exports.getByKey = resourcesUtil.getByKeyResourceSpec(
    nameAndKey, parameters.id,{
        struktur: commonParameters.struktur,
        crs: commonParameters.crs
    },
    representations,
    sqlModel
);

Object.keys(exports).forEach(key => {
    registry.add(nameAndKey.singular, 'resource', key, exports[key]);
});
