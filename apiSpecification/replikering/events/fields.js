"use strict";

var _ = require('underscore');

var fieldsUtil = require('../../common/fieldsUtil');
var sqlModels = require('./sqlModels');
var mappings = require('../columnMappings');

var d = require('../../util').d;

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
  var entityFields = mappings.columnMappings[datamodelName].map(columnMapping => ({
    name: columnMapping.name,
    selectable: true,
    formatter: columnMapping.formatter
  }));

  memo[datamodelName] = commonFields.concat(entityFields);
  return memo;
}, {});


module.exports = fields;

_.each(fields, (fieldSpec, key) => {
  fieldsUtil.applySelectability(fieldSpec, sqlModels[key]);
  fieldsUtil.normalize(fieldSpec)
});
