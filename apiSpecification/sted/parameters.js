"use strict";

const registry = require('../registry');

const normalizeParameters = require('../common/parametersUtil').normalizeParameters;
const schema = require('../parameterSchema');

module.exports = {
  id: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'id',
        type: 'string',
        schema: schema.uuid,
        multi: true
      },
      {
        name: 'hovedtype',
        type: 'string',
        multi: true
      },
      {
        name: 'undertype',
        type: 'string',
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

registry.addMultiple('sted', 'parameterGroup', module.exports);
