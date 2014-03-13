var schema = require('../parameterSchema');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

module.exports = {
  id: normalizeParameters([
    {
      name: 'navn'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr,
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
