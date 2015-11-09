"use strict";
var schema = require('../parameterSchema');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  propertyFilter: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid,
      multi: true
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr,
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    }
  ])
};
