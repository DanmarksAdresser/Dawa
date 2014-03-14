"use strict";

var _ = require('underscore')

var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');

module.exports = resourcesUtil.defaultResources(nameAndKey, parameters.id, parameters.propertyFilter, representations, sqlModel);

var registry = require('../registry');
var qualifiers = ['query', 'autocomplete', 'getByKey'];
_.zip(qualifiers, module.exports).forEach(function(pair) {
  registry.add('vejstykke', 'resource', pair[0], pair[1]);
});