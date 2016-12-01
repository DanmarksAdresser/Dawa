"use strict";

var registry = require('../registry');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var schema = require('../parameterSchema');

module.exports = {
  id: normalizeParameters([
    {
      name: 'nr',
      type: 'integer',
      schema: schema.postnr
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'nr',
        type: 'integer',
        multi: true,
        schema: schema.postnr
      },
      {
        name: 'navn',
        multi: true
      },
      {
        name: 'kommunekode',
        type: 'integer',
        multi: true
      }
    ]),
  stormodtagerFilter: normalizeParameters([
    {
      name: 'stormodtagere',
      type: 'boolean',
      defaultValue: 'false'
    }
  ])
};

registry.addMultiple('postnummer', 'parameterGroup', module.exports);
