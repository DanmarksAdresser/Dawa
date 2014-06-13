"use strict";

var _ = require('underscore');

var representationUtil = require('../../common/representationUtil');
var columnMappings = require('../columnMappings').columnMappings;
var fields = require('./fields');

module.exports = _.reduce(Object.keys(columnMappings), function(memo, datamodelName) {
  memo[datamodelName] = {
    flat: representationUtil.defaultFlatRepresentation(fields[datamodelName])
  };
  return memo;
}, {});