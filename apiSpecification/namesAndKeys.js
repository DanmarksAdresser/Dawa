"use strict";

/**
 * This file speficies the name and field name(s) of the primary key of each resource type. Singular is the key.
 * Plural is currently used for the http path of the resource.
 */

var dagiTemaer = require('./dagiTemaer');

exports.adresse = {
  plural: 'adresser',
  key: ['id']
};

exports.adgangsadresse = {
  plural: 'adgangsadresser',
  key: ['id']
};

exports.supplerendebynavn = {
  plural: 'supplerendebynavne',
  key: ['navn']
};

exports.postnummer = {
  plural: 'postnumre',
  key: ['nr']
};

exports.vejnavn = {
  plural: 'vejnavne',
  key: ['navn']
};

exports.vejstykke = {
  plural: 'vejstykker',
  key: ['kommunekode', 'kode']
};

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    plural: tema.plural,
    key: ['kode']
  };
});