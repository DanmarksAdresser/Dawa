"use strict";

var registry = require('../registry');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'nr',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'nr',
        type: 'integer',
        multi: true
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
      type: 'boolean'
    }
  ])
};

registry.addMultiple('postnummer', 'parameterGroup', module.exports);
