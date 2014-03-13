"use strict";

var parameters = require('./parameters');
var nameAndKey = require('./nameAndKey');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../common/resourcesUtil');

module.exports = resourcesUtil.defaultResources(nameAndKey, parameters.id, parameters.propertyFilter, representations, sqlModel);