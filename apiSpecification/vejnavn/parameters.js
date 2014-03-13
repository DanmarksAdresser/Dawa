var schema = require('../parameterSchema');

var normalizeParameter = require('../common/parametersUtil').normalizeParameter;

var _ = require('underscore');

module.exports = {
  id: _.map([
    {
      name: 'navn'
    }
  ], normalizeParameter),
  propertyFilter: _.map([
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
  ], normalizeParameter)
};
