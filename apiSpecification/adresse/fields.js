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

var fields = [
  {
    name: 'id'
  },
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
    name: 'husnr'
  },
  normalizedField('etage'),
  normalizedField('dør'),
  {
    name: 'supplerendebynavn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'postnrnavn'
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
    name: 'esrejendomsnr'
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
    name: 'dagitemaer',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;