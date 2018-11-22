"use strict";

const registry = require('../registry');

const normalizeParameters = require('../common/parametersUtil').normalizeParameters;
const schema = require('../parameterSchema');

module.exports = {
  id: normalizeParameters([
    {
      name: 'sted_id',
      type: 'string',
      schema: schema.uuid
    },
    {
      name: 'navn',
      type: 'string'
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'sted_id',
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
        multi: true,
        renameTo: 'sted_kommunekode'
      },
      {
        name: 'navnestatus',
        type: 'string',
        schema: {
          enum: ['officielt', 'uofficielt', 'suAutoriseret']
        }
      },
      {
        name: 'brugsprioritet',
        type: 'string',
        schema: {
          enum: ['primær', 'sekundær']
        }
      }

    ])
};

registry.addMultiple('stednavn', 'parameterGroup', module.exports);
