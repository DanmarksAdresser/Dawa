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
        name: 'navn',
        type: 'string',
        multi: true
      },
      {
        name: 'type',
        type: 'string',
        multi: true
      }
    ])
};

registry.addMultiple('bebyggelse', 'parameterGroup', module.exports);
