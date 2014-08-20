"use strict";

var _ = require('underscore');

var representationUtil = require('../../common/representationUtil');
var columnMappings = require('../columnMappings').columnMappings;
var fields = require('./fields');

module.exports = _.reduce(Object.keys(columnMappings), function(memo, datamodelName) {
  var flatRepresentation = representationUtil.defaultFlatRepresentation(fields[datamodelName]);
  memo[datamodelName] = {
    flat: flatRepresentation,
    json: {
      fields: flatRepresentation.fields,
      mapper: function() {
        return _.identity;
      }
    }
  };
  return memo;
}, {});