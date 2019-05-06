"use strict";

var schema = require('../parameterSchema');
var registry = require('../registry');

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
    schema: schema.uuid,
    multi: true
  }
]));

exports.husnrinterval = adgangsadresseParameters.husnrinterval;
exports.includeInvalid = adgangsadresseParameters.includeInvalid;
exports.geometri = adgangsadresseParameters.geometri;

registry.addMultiple('adresse', 'parameterGroup', module.exports);
