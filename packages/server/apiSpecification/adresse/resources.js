"use strict";

var _ = require('underscore');
var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');
var commonParameters = require('../common/commonParameters');
const adgangsadresseParameters = require('../adgangsadresse/parameters');
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
        includeDeleted: parameters.includeDeleted,
        search: commonParameters.search,
        crs: commonParameters.crs,
        struktur: commonParameters.struktur,
        geomWithin: commonParameters.geomWithin,
        fuzzy: commonParameters.fuzzy,
        kvhx: {
          name: 'kvhx',
          type: 'string',
          validateFun: kvhxTransformer.validate
        },
        geometri: parameters.geometri,
      stednavnafstand: adgangsadresseParameters.stednavnafstand
      }, representations,
      sqlModel)),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    husnrinterval: parameters.husnrinterval,
    includeInvalid: parameters.includeInvalid,
    geomWithin: commonParameters.geomWithin,
    autocomplete: commonParameters.autocomplete,
    crs: commonParameters.crs,
    fuzzy: commonParameters.fuzzy,
    stednavnafstand: adgangsadresseParameters.stednavnafstand
  }, representations.autocomplete, sqlModel),
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
var qualifiers = ['query', 'autocomplete', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('adresse', 'resource', pair[0], pair[1]);
});
