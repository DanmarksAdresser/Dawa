"use strict";

var _ = require('underscore');

var fieldsUtil = require('../common/fieldsUtil');
var sqlModels = require('./sqlModels');
var mappings = require('./columnMappings');

var d = require('../util').d;

var fields = _.reduce(sqlModels, function(memo, sqlModel, dataModelName) {
  var commonFields = [{
    name: 'sekvensnummer'
  }, {
    name: 'tidspunkt',
    formatter: d
  }, {
    name: 'operation'
  }];

  var entityFields = _.map(mappings[dataModelName], function(columnMapping) {
    return {
      name: columnMapping.name,
      selectable: true
    };
  });

  memo[dataModelName] = commonFields.concat(entityFields);
  return memo;
}, {});

module.exports =  _.reduce(fields, function(memo, fieldSpec, dataModelName) {
  memo[dataModelName] = fieldsUtil.normalize(fieldSpec);
  return memo;
}, {});