"use strict";

var dagiTemaer = require('./temaer');
var parameters = require('./parameters');
var namesAndKeys = require('./namesAndKeys');
var representationsMap = require('./representations');
var sqlModels = require('./sqlModels');
var resourcesUtil = require('../common/resourcesUtil');
var commonParameters = require('../common/commonParameters');
var registry = require('../registry');
var _ = require('underscore');

var publishedTemaer = _.filter(dagiTemaer, function(tema) {
  // postnumre er ikke med, de udskilles med en anden mekanisme
  return tema.singular !== 'postnummer';
});

publishedTemaer.forEach(function(tema) {
  var nameAndKey = namesAndKeys[tema.singular];
  var sqlModel = sqlModels[tema.singular];
  var representations = representationsMap[tema.singular];
  var resources = [
  resourcesUtil.queryResourceSpec(nameAndKey, {
      propertyFilter: parameters.propertyFilter,
      search: commonParameters.search,
      crs: commonParameters.crs
    }, representations,
    sqlModel),
    resourcesUtil.autocompleteResourceSpec(nameAndKey, {
      propertyFilter: parameters.propertyFilter,
      autocomplete: commonParameters.autocomplete
    }, representations.autocomplete, sqlModel),
    resourcesUtil.reverseGeocodingResourceSpec('/' + nameAndKey.plural + '/reverse', representations, sqlModel),
    resourcesUtil.getByKeyResourceSpec(nameAndKey, [_.findWhere(parameters.propertyFilter, {name: tema.key})], {crs : commonParameters.crs }, representations, sqlModel)
    ];
  exports[tema.singular] = resources;

  var qualifiers = ['query', 'autocomplete', 'reverseGeocoding', 'getByKey'];
  _.zip(qualifiers, resources).forEach(function(pair) {
    registry.add(tema.singular, 'resource', pair[0], pair[1]);
  });
});
