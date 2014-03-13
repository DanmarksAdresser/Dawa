"use strict";

var schema = require('../parameterSchema');

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
        name: 'kommune',
        multi: true
      }
    ])
};