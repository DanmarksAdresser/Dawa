"use strict";
var schema = require('../parameterSchema');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var registry = require('../registry');

const adgangsadressePropertyFilters = normalizeParameters([
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
]);

const adressePropertyFilters = adgangsadressePropertyFilters.concat(normalizeParameters(
  [{
    name: 'adgangsadresseid',
    type: 'string',
    schema: schema.uuid,
    multi: true
  }]
));

module.exports = {
  adgangsadresse_history: {propertyFilter: adgangsadressePropertyFilters },
  adresse_history: {propertyFilter: adressePropertyFilters}
};

for(let entity of ['adgangsadresse_history', 'adresse_history']) {
  registry.addMultiple(entity, 'parameterGroup', module.exports[entity]);
}

