"use strict";
var _ = require('underscore');
var datamodels = require('../../crud/datamodel');
var keyParameters = {};

keyParameters.vejstykke = require('../vejstykke/parameters').id;
keyParameters.postnummer = require('../postnummer/parameters').id;
keyParameters.adgangsadresse = require('../adgangsadresse/parameters').id;
keyParameters.adresse = require('../adresse/parameters').id;

exports.keyParameters = keyParameters;

exports.sekvensnummer = [
  {
    name: 'sekvensnummerfra',
    type: 'integer'
  },
  {
    name: 'sekvensnummertil',
    type: 'integer'
  }
];

exports.tidspunkt = [
  {
    name: 'tidspunktfra',
    type: 'string'
  }, {
    name: 'tidspunkttil',
    type: 'string'
  }
];

