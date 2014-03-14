"use strict";

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
  resourcesUtil.getByKeyResourceSpec(nameAndKey,
    parameters.id,
    {crs : commonParameters.crs },
    representations,
    sqlModel)
];