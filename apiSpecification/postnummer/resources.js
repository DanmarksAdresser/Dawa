"use strict";

var _ = require('underscore');
var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');
var commonParameters = require('../common/commonParameters');

module.exports = [
  // query
  resourcesUtil.queryResourceSpec(nameAndKey, {
      propertyFilter: parameters.propertyFilter,
      search: commonParameters.search,
      crs: commonParameters.crs,
      struktur: commonParameters.struktur,
      geomWithin: commonParameters.geomWithin,
      stormodtagerFilter: parameters.stormodtagerFilter,
      landpostnumre: parameters.landpostnumre
    }, representations,
    sqlModel),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    autocomplete: commonParameters.autocomplete,
    stormodtagerFilter: parameters.stormodtagerFilter
  }, representations.autocomplete, sqlModel),
  resourcesUtil.reverseGeocodingResourceSpec('/postnumre/reverse', representations, sqlModel, {
    landpostnumre: parameters.landpostnumre
  }),
  resourcesUtil.getByKeyResourceSpec(
    nameAndKey, parameters.id,
    {
      crs: commonParameters.crs,
      struktur: commonParameters.struktur,
      landpostnumre: parameters.landpostnumre
    },
    representations,
    sqlModel)
];

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'reverseGeocoding', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function (pair) {
  registry.add('postnummer', 'resource', pair[0], pair[1]);
});
