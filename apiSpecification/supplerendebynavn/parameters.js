"use strict";

var schema = require('../parameterSchema');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([{
    name: 'navn'
  }]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'postnr',
      multi: true
    }
  ])
};