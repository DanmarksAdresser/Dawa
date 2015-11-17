"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
var sqlModels = require('./sqlModels');

var normalizedAdgangsadresseField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};

var normalizedAdresseField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adresse', fieldName);
};

exports.adgangsadresse = [
  normalizedAdgangsadresseField('id'),
  normalizedAdgangsadresseField('status'),
  {
    name: 'adgangspunktstatus'
  },
  normalizedAdgangsadresseField('kommunekode'),
  normalizedAdgangsadresseField('vejkode'),
  {
    name: 'vejnavn'
  },
  normalizedAdgangsadresseField('husnr'),
  normalizedAdgangsadresseField('supplerendebynavn'),
  normalizedAdgangsadresseField('postnr'),
  {
    name: 'postnrnavn'
  },
  {
    name: 'virkningstart'
  },
  {
    name: 'virkningslut'
  }
];

exports.adresse = module.exports.adgangsadresse.concat([
  normalizedAdresseField('id'),
  normalizedAdresseField('status'),
  {
    name: 'adgangsadressestatus'
  },
  {
    name: 'adgangspunktstatus'
  },
  normalizedAdgangsadresseField('kommunekode'),
  normalizedAdgangsadresseField('vejkode'),
  {
    name: 'vejnavn'
  },
  normalizedAdgangsadresseField('husnr'),
  normalizedAdresseField('etage'),
  normalizedAdresseField('dør'),
  normalizedAdgangsadresseField('supplerendebynavn'),
  normalizedAdgangsadresseField('postnr'),
  {
    name: 'postnrnavn'
  },
  {
    name: 'virkningstart'
  },
  {
    name: 'virkningslut'
  }
]);

fieldsUtil.applySelectability(exports.adgangsadresse, sqlModels.adgangsadresse);
fieldsUtil.applySelectability(exports.adresse, sqlModels.adresse);
fieldsUtil.normalize(exports.adgangsadresse);
fieldsUtil.normalize(exports.adresse);
