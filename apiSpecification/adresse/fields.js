"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var util = require('../util');
var kode4String = util.kode4String;
var d = util.d;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('adresse', fieldName);
};

var normalizedAdgangsadresseField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};


var fields = [
  {
    name: 'id'
  },
  {
    name: 'kvhx',
    selectable: false
  },
  normalizedField('status'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  {
    name: 'vejkode',
    formatter: kode4String
  },
  {
    name: 'vejnavn'
  },
  {
    name: 'adresseringsvejnavn'
  },
  normalizedAdgangsadresseField('husnr'),
  normalizedField('etage'),
  normalizedField('dør'),
  {
    name: 'supplerendebynavn'
  },
  normalizedAdgangsadresseField('postnr'),
  {
    name: 'postnrnavn'
  },
  {
    name: 'stormodtagerpostnr',
    formatter: kode4String
  },
  {
    name: 'stormodtagerpostnrnavn'
  },
  {
    name: 'kommunekode',
    formatter: kode4String
  },
  {
    name: 'kommunenavn'
  },
  {
    name: 'ejerlavkode'
  },
  {
    name: 'ejerlavnavn'
  },
  {
    name: 'matrikelnr'
  },
  {
    name: 'esrejendomsnr',
    formatter: util.numberToString
  },
  {
    name: 'etrs89koordinat_øst'
  },
  {
    name: 'etrs89koordinat_nord'
  },
  {
    name: 'wgs84koordinat_bredde'
  },
  {
    name: 'wgs84koordinat_længde'
  },
  {
    name: 'nøjagtighed'
  },
  {
    name: 'kilde'
  },
  {
    name: 'tekniskstandard'
  },
  {
    name: 'tekstretning'
  },
  {
    name: 'ddkn_m100'
  },
  {
    name: 'ddkn_km1'
  },
  {
    name: 'ddkn_km10'
  },
  {
    name: 'adressepunktændringsdato',
    formatter: d
  },
  normalizedField('adgangsadresseid'),
  {
    name: 'adgangsadresse_status'
  },
  {
    name: 'geom_json'
  },
  {
    name: 'adgangsadresse_oprettet',
    formatter: d
  },
  {
    name: 'adgangsadresse_ændret',
    formatter: d
  },
  {
    name: 'regionskode',
    formatter: kode4String
  },
  {
    name: 'regionsnavn'
  },
  {
    name: 'jordstykke_ejerlavnavn'
  },
  {
    name: 'temaer',
    multi: true
  },
  {
    name: 'jordstykke_ejerlavkode'
  },
  {
    name: 'jordstykke_matrikelnr'
  },
  {
    name: 'jordstykke_esrejendomsnr',
    formatter: util.numberToString
  },
  {
    name: 'kvh',
    selectable: false
  },
  {
    name: 'højde'
  },
  {
    name: 'x'
  },
  {
    name: 'y'
  },
  {
    name: 'bebyggelser',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
