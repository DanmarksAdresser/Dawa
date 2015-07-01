"use strict";

var _ = require('underscore');

var oisApiFacts = require('../../ois/oisApiFacts');
var oisPropertyParameters = require('../../ois/oisPropertyParameters');
var schema = require('../../parameterSchema');
var temaer = require('../../temaer/temaer');
var tilknytninger = require('../../tematilknytninger/tilknytninger');

var keyParameters = {};

// For events we support retrieval of the events by object id
keyParameters.vejstykke = require('../../vejstykke/parameters').id;
keyParameters.postnummer = require('../../postnummer/parameters').id;
keyParameters.adgangsadresse = require('../../adgangsadresse/parameters').id;
keyParameters.adresse = require('../../adresse/parameters').id;
keyParameters.ejerlav = require('../../ejerlav/parameters').id;

Object.keys(oisApiFacts).forEach(function(entityName) {
  var apiFacts = oisApiFacts[entityName];
  var parameter = _.findWhere(oisPropertyParameters[entityName],{ name: apiFacts.key[0] });
  if(parameter) {
    keyParameters[entityName] = [parameter];
  }
});

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

