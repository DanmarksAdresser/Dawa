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
  return tema.published;
});

publishedTemaer.forEach(function(tema) {
  var nameAndKey = namesAndKeys[tema.singular];
  var sqlModel = sqlModels[tema.singular];
  var representations = representationsMap[tema.singular];
  var queryParams = {
    propertyFilter: parameters[tema.singular].propertyFilter,
    crs: commonParameters.crs,
    geomWithin: commonParameters.geomWithin
  };

  if(tema.searchable) {
    queryParams.search = commonParameters.search
  }

  var resources = [
    resourcesUtil.queryResourceSpec(nameAndKey,
      queryParams,
      representations,
      sqlModel)];
  if(tema.searchable) {
    resources.push(resourcesUtil.autocompleteResourceSpec(nameAndKey, {
      propertyFilter: parameters[tema.singular].propertyFilter,
      autocomplete: commonParameters.autocomplete
    }, representations.autocomplete, sqlModel));
  }
  resources = resources.concat([
    resourcesUtil.reverseGeocodingResourceSpec('/' + nameAndKey.plural + '/reverse', representations, sqlModel),
    resourcesUtil.getByKeyResourceSpec(nameAndKey, parameters[tema.singular].id, {crs: commonParameters.crs}, representations, sqlModel)
  ]);
  exports[tema.singular] = resources;

  var qualifiers = ['query'].concat(tema.searchable ? ['autocomplete'] : []).concat([ 'reverseGeocoding', 'getByKey']);
  _.zip(qualifiers, resources).forEach(function(pair) {
    registry.add(tema.singular, 'resource', pair[0], pair[1]);
  });
});
