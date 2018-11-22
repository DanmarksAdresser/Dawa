"use strict";

const registry = require('../registry');

const normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'ejerlavkode',
      type: 'integer'
    },
    {
      name: 'matrikelnr',
      type: 'string'
    }
  ]),
  propertyFilter: normalizeParameters(
    [
      {
        name: 'ejerlavkode',
        type: 'integer'
      },
      {
        name: 'matrikelnr',
        type: 'string'
      },
      {
        name: 'kommunekode',
        type: 'integer'
      },
      {
        name: 'sognekode',
        type: 'integer'
      },
      {
        name: 'regionskode',
        type: 'integer'
      },
      {
        name: 'retskredskode',
        type: 'integer'
      },
      {
        name: 'udvidet_esrejendomsnr',
        type: 'integer'
      },
      {
        name: 'esrejendomsnr',
        type: 'integer'
      },
      {
        name: 'sfeejendomsnr',
        type: 'string'
      }
    ])
};

registry.addMultiple('jordstykke', 'parameterGroup', module.exports);
