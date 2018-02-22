"use strict";

const schema = require('../../parameterSchema');
const keyParameters = {};
const flatTilknytninger = require('../../flats/tilknytninger/tilknytninger');
const flats = require('../../flats/flats');
const normalizeParameters = require('../../common/parametersUtil').normalizeParameters;
const temaModels = require('../../../dagiImport/temaModels');

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

for(let model of temaModels.modelList) {
  keyParameters[model.tilknytningName] = [
    {
      name: 'adgangsadresseid',
      type: 'string',
      schema: schema.uuid
    }
  ];
}

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
exports.sekvensnummer = normalizeParameters([
  {
    name: 'sekvensnummerfra',
    type: 'integer'
  },
  {
    name: 'sekvensnummertil',
    type: 'integer'
  }
]);

// timestamp filtering is supported for all events
exports.tidspunkt = normalizeParameters([
  {
    name: 'tidspunktfra',
    type: 'string'
  }, {
    name: 'tidspunkttil',
    type: 'string'
  }
]);

