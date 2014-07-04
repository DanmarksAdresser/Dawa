"use strict";

var registry = require('../registry');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ])
};

registry.addMultiple('ejerlav', 'parameterGroup', module.exports);
