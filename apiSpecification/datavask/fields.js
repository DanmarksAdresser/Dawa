"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
var sqlModel = require('./sqlModel');

var normalizedAdgangsadresseField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};

var normalizedAdresseField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adresse', fieldName);
};

exports.adgangsadresse = [
  normalizedAdgangsadresseField('id'),
  normalizedAdgangsadresseField('status'),
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
  normalizedAdgangsadresseField('kommunekode'),
  {
    name: 'virkningstart'
  },
  {
    name: 'virkningslut'
  },
  {
    name: 'current'
  }
];

exports.adresse = module.exports.adgangsadresse.concat([
  normalizedAdresseField('etage'),
  normalizedAdresseField('dør')
]);

fieldsUtil.applySelectability(exports.adgangsadresse, sqlModel.adgangsadresse);
fieldsUtil.applySelectability(exports.adresse, sqlModel.adresse);
fieldsUtil.normalize(exports.adgangsadresse);
fieldsUtil.normalize(exports.adresse);
