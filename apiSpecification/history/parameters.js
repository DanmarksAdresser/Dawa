"use strict";
var schema = require('../parameterSchema');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var registry = require('../registry');

module.exports = {
  propertyFilter: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid,
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

['adresse_history', 'adgangsadresse_history'].forEach((entityName) => {
  registry.addMultiple(entityName, 'parameterGroup', module.exports);
});
