"use strict";

const registry = require('../registry');

const normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'id',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'id',
        type: 'integer'
      },
      {
        name: 'bbrbygning_id',
        type: 'string'
      },
      {
        name: 'bygningstype',
        type: 'string'
      },
      {
        name: 'metode3d',
        type: 'string'
      },
      {
        name: 'målested',
        type: 'string'
      },
      {
        name: 'kommunekode',
        type: 'integer'
      }
    ])
};

registry.addMultiple('bygning', 'parameterGroup', module.exports);
