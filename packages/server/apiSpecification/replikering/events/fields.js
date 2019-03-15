"use strict";

const _ = require('underscore');

const fieldsUtil = require('../../common/fieldsUtil');
const datamodel = require('../datamodel');
const dbBindings = require('../dbBindings');
const sqlModels = require('./sqlModels');

const d = require('../../util').d;
const {legacyFormatter } = require('../bindings/util');

const fields = Object.keys(datamodel).reduce((memo, entityName) => {
  const model = datamodel[entityName];
  const binding = dbBindings[entityName];

  // All events has these fields
  const commonFields = [
    {
      name: 'txid'
    },
    {
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
  const entityFields = model.attributes.map(field => ({
      name: field.name,
      selectable: true,
      formatter: legacyFormatter(field.name, binding)
    }));

  memo[entityName] = [...commonFields, ...entityFields];
  return memo;
}, {});


module.exports = fields;

_.each(fields, (fieldSpec, key) => {
  fieldsUtil.applySelectability(fieldSpec, sqlModels[key]);
  fieldsUtil.normalize(fieldSpec)
});
