"use strict";

var _ = require('underscore');

var fieldsUtil = require('../../common/fieldsUtil');
var sqlModels = require('./sqlModels');
var mappings = require('./../columnMappings');

var d = require('../util').d;

var fields = _.reduce(sqlModels, function(memo, sqlModel, datamodelName) {

  // All events has these fields
  var commonFields = [{
    name: 'sekvensnummer'
  }, {
    name: 'tidspunkt',
    formatter: d
  }, {
    name: 'operation'
  }];

  // The fields specific for this entity are retrieved from the SQL model,
  // because there is a 1-1 correspondence between the internal and external model
  // on the replication APIs.
  var entityFields = _.map(mappings[datamodelName], function(columnMapping) {
    return {
      name: columnMapping.name,
      selectable: true,
      formatter: columnMapping.formatter
    };
  });

  memo[datamodelName] = commonFields.concat(entityFields);
  return memo;
}, {});

module.exports =  _.reduce(fields, function(memo, fieldSpec, dataModelName) {
  memo[dataModelName] = fieldsUtil.normalize(fieldSpec);
  return memo;
}, {});