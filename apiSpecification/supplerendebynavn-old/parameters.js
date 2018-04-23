"use strict";

var schema = require('../parameterSchema');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

var registry = require('../registry');

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
      type: 'integer',
      multi: true
    }
  ])
};

registry.addMultiple('supplerendebynavn-old', 'parameterGroup', module.exports);