"use strict";

var _ = require('underscore');

var oisApiFacts = require('./oisApiFacts');
var representations = require('./representations');
var resourcesUtil = require('../common/resourcesUtil');
var registry = require('../registry');
var sqlModels = require('./sqlModels');
module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var apiFacts = oisApiFacts[entityName];
  var query = resourcesUtil.queryResourceSpec(apiFacts, {}, representations[entityName], sqlModels[entityName]);
  memo[entityName] = {
    query: query
  };
  return memo;
}, {});

_.each(module.exports, function(resources, entityName) {
  _.each(resources, function(resource, qualifier) {
    registry.add(entityName, 'resource', qualifier, resource);
  });
});