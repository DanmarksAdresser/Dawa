"use strict";

var _ = require('underscore');
var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');
var commonParameters = require('../common/commonParameters');
var kvhxTransformer = require('./kvhxTransformer');

function kvhxDecorator(resourceSpec) {
  var decorated = resourceSpec.processParameters;
  resourceSpec.processParameters = function (params) {
    if (decorated) {
      decorated(params);
    }

    if (params.kvhx) {
      _.extend(params, kvhxTransformer.parse(params.kvhx));
    }
  };

  return resourceSpec;
}


module.exports = [
  // query
  kvhxDecorator(
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
        kvhx: {
          name: 'kvhx',
          type: 'string',
          validateFun: kvhxTransformer.validate
        }
      }, representations,
      sqlModel)),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    husnrinterval: parameters.husnrinterval,
    includeInvalid: parameters.includeInvalid,
    geomWithin: commonParameters.geomWithin,
    dagiFilter: commonParameters.dagiFilter,
    autocomplete: commonParameters.autocomplete,
    crs: commonParameters.crs,
    fuzzy: commonParameters.fuzzy
  }, representations.autocomplete, sqlModel),
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
var qualifiers = ['query', 'autocomplete', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('adresse', 'resource', pair[0], pair[1]);
});
