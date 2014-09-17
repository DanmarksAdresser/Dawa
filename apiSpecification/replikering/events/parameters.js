"use strict";

var keyParameters = {};

// For events we support retrieval of the events by object id
keyParameters.vejstykke = require('../../vejstykke/parameters').id;
keyParameters.postnummer = require('../../postnummer/parameters').id;
keyParameters.adgangsadresse = require('../../adgangsadresse/parameters').id;
keyParameters.adresse = require('../../adresse/parameters').id;
keyParameters.ejerlav = require('../../ejerlav/parameters').id;

exports.keyParameters = keyParameters;

// sequence number filtering is supported for all events
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

// timestamp filtering is supported for all events
exports.tidspunkt = [
  {
    name: 'tidspunktfra',
    type: 'string'
  }, {
    name: 'tidspunkttil',
    type: 'string'
  }
];

