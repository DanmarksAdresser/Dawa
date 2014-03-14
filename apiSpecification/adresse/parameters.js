"use strict";

var schema = require('../parameterSchema');

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

var adgangsadresseParameters = require('../adgangsadresse/parameters');

exports.id = normalizeParameters([
  {
    name: 'id',
    type: 'string',
    schema: schema.uuid
  }
]);


exports.propertyFilter = normalizeParameters(adgangsadresseParameters.propertyFilter.concat([
  {
    name: 'etage',
    multi: true
  },
  {
    name: 'dør',
    multi: true
  },
  {
    name: 'adgangsadresseid',
    multi: true
  }
]));