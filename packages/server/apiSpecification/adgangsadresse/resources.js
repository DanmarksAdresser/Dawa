"use strict";

var _ = require('underscore');

var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');
var commonParameters = require('../common/commonParameters');
var kvhTransformer = require('./kvhTransformer');

function kvhDecorator(resourceSpec) {
  var decorated = resourceSpec.processParameters;
  resourceSpec.processParameters = function (params) {
    if (decorated) {
      decorated(params);
    }

    if (params.kvh) {
      _.extend(params, kvhTransformer.parse(params.kvh));
    }
  };

  return resourceSpec;
}

module.exports = [
  // query
  kvhDecorator(
    resourcesUtil.queryResourceSpec(nameAndKey, {
        propertyFilter: parameters.propertyFilter,
        husnrinterval: parameters.husnrinterval,
        includeInvalid: parameters.includeInvalid,
        includeDeleted: parameters.includeDeleted,
        search: commonParameters.search,
        crs: commonParameters.crs,
        struktur: commonParameters.struktur,
        geomWithin: commonParameters.geomWithin,
        fuzzy: commonParameters.fuzzy,
        stednavnafstand: parameters.stednavnafstand,
        kvh: {
          name: 'kvh',
          type: 'string',
          validateFun: kvhTransformer.validate
        },
        geometri: parameters.geometri
      },
      representations,
      sqlModel)),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    includeInvalid: parameters.includeInvalid,
    includeDeleted: parameters.includeDeleted,
    crs: commonParameters.crs,
    husnrinterval: parameters.husnrinterval,
    geomWithin: commonParameters.geomWithin,
    autocomplete: commonParameters.autocomplete,
    fuzzy: commonParameters.fuzzy,
    stednavnafstand: parameters.stednavnafstand
  }, representations.autocomplete, sqlModel),
  resourcesUtil.reverseGeocodingResourceSpec(
    '/adgangsadresser/reverse',
    representations,
    sqlModel,
    {
      includeInvalid: parameters.includeInvalid,
      includeDeleted: parameters.includeDeleted,
      geometri: parameters.geometri
    }
  ),
  resourcesUtil.getByKeyResourceSpec(nameAndKey,
    parameters.id,
    {
      includeInvalid: parameters.includeInvalid,
      includeDeleted: parameters.includeDeleted,
      crs: commonParameters.crs,
      struktur: commonParameters.struktur,
      geometri: parameters.geometri
    },
    representations,
    sqlModel)
];

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'reverseGeocoding', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('adgangsadresse', 'resource', pair[0], pair[1]);
});
