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
      geomWithin: commonParameters.geomWithin,
      dagiFilter: commonParameters.dagiFilter
    }, representations,
    sqlModel),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    geomWithin: commonParameters.geomWithin,
    dagiFilter: commonParameters.dagiFilter,
    autocomplete: commonParameters.autocomplete
  }, representations.autocomplete, sqlModel),
  /*
   * Reverse geocoding resource
   */
  {
    path: '/adgangsadresser/reverse',
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters(
      {
        format: commonParameters.format,
        crs: commonParameters.crs,
        reverseGeocoding: commonParameters.reverseGeocoding
      }),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: true,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters:  function() {}
  },
  resourcesUtil.getByKeyResourceSpec(nameAndKey,
    parameters.id,
    {crs : commonParameters.crs },
    representations,
    sqlModel)
];

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'reverseGeocoding', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function(pair) {
  registry.add('adgangsadresse', 'resource', pair[0], pair[1]);
});