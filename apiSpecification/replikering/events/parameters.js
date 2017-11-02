"use strict";

var _ = require('underscore');
var schema = require('../../parameterSchema');
var temaer = require('../../temaer/temaer');
var tilknytninger = require('../../tematilknytninger/tilknytninger');
var keyParameters = {};
const flatTilknytninger = require('../../flats/tilknytninger/tilknytninger');
const flats = require('../../flats/flats');
const normalizeParameters = require('../../common/parametersUtil').normalizeParameters;

// For events we support retrieval of the events by object id
keyParameters.vejstykke = require('../../vejstykke/parameters').id;
keyParameters.postnummer = require('../../postnummer/parameters').id;
keyParameters.adgangsadresse = require('../../adgangsadresse/parameters').id;
keyParameters.adresse = require('../../adresse/parameters').id;
keyParameters.ejerlav = require('../../ejerlav/parameters').id;
keyParameters.navngivenvej = require('../../navngivenvej/parameters').id;
keyParameters.vejstykkepostnummerrelation = normalizeParameters([
  {
    name: 'kommunekode',
    type: 'integer',
    schema: schema.kode4
  },
  {
    name: 'vejkode',
    type: 'integer',
    schema: schema.kode4
  },
  {
    name: 'postnr',
    type: 'integer',
    schema: schema.postnr
  }
]);
keyParameters.stednavntilknytning = normalizeParameters([
  {
    name: 'stednavn_id',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'adgangsadresse_id',
    type: 'string',
    schema: schema.uuid
  }
]);

exports.keyParameters = keyParameters;

_.each(tilknytninger, function(tilknytning, temaNavn) {
  var tema = _.findWhere(temaer, {singular: temaNavn});
  keyParameters[tema.prefix + 'tilknytning'] = [
    {
      name: 'adgangsadresseid',
      type: 'string',
      schema: schema.uuid
    }
  ];
});

Object.keys(flatTilknytninger).forEach(flatName => {
  const flat = flats[flatName];
  keyParameters[flat.prefix + 'tilknytning'] = [
    {
      name: 'adgangsadresseid',
      type: 'string',
      schema: schema.uuid
    }
  ];
});

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

