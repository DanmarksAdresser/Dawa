const normalizeParameters = require('../common/parametersUtil').normalizeParameters;
const registry = require('../registry');

module.exports = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kode',
      type: 'integer',
      multi: true
    }
  ])
};

registry.addMultiple('opstillingskreds', 'parameterGroup', module.exports);