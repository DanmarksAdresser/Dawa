"use strict";

var _ = require('underscore');

var commonParameters = require('../common/commonParameters');
var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');

module.exports = [
  // query
  resourcesUtil.queryResourceSpec(nameAndKey, {
      propertyFilter: parameters.propertyFilter,
      search: commonParameters.search,
      fuzzy: commonParameters.fuzzy
    }, representations,
    sqlModel),
  resourcesUtil.autocompleteResourceSpec(nameAndKey, {
    propertyFilter: parameters.propertyFilter,
    autocomplete: commonParameters.autocomplete,
    fuzzy: commonParameters.fuzzy
  }, representations.autocomplete, sqlModel),
  resourcesUtil.getByKeyResourceSpec(nameAndKey, parameters.id, {}, representations, sqlModel)
];

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function(pair) {
  registry.add('vejnavn', 'resource', pair[0], pair[1]);
});