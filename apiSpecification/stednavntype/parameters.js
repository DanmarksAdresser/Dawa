"use strict";

const registry = require('../registry');

const normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'hovedtype',
      type: 'string'
    }
  ]),
  propertyFilter: normalizeParameters(
    [{
      name: 'hovedtype',
      type: 'string'
    }]),
};

registry.addMultiple('stednavntype', 'parameterGroup', module.exports);
