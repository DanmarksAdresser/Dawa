"use strict";

var registry = require('../registry');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'kode',
        multi: true
      },
      {
        name: 'navn',
        multi: true
      }
    ])
};

registry.addMultiple('ejerlav', 'parameterGroup', module.exports);
