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
        search: commonParameters.search,
        crs: commonParameters.crs,
        struktur: commonParameters.struktur,
        geomWithin: commonParameters.geomWithin,
        dagiFilter: commonParameters.dagiFilter,
        fuzzy: commonParameters.fuzzy,
        kvh: {
          name: 'kvh',
          type: 'string',
          validateFun: kvhTransformer.validate
        }
      },
      representations,
      sqlModel)),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    includeInvalid: parameters.includeInvalid,
    crs: commonParameters.crs,
    husnrinterval: parameters.husnrinterval,
    geomWithin: commonParameters.geomWithin,
    dagiFilter: commonParameters.dagiFilter,
    autocomplete: commonParameters.autocomplete,
    fuzzy: commonParameters.fuzzy
  }, representations.autocomplete, sqlModel),
  resourcesUtil.reverseGeocodingResourceSpec(
    '/adgangsadresser/reverse',
    representations,
    sqlModel
  ),
  resourcesUtil.getByKeyResourceSpec(nameAndKey,
    parameters.id,
    {
      includeInvalid: parameters.includeInvalid,
      crs: commonParameters.crs,
      struktur: commonParameters.struktur
    },
    representations,
    sqlModel)
];

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'reverseGeocoding', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('adgangsadresse', 'resource', pair[0], pair[1]);
});
