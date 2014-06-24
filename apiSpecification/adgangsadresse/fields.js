"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};

var fields = [
  normalizedField('id'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  normalizedField('vejkode'),
  {
    name: 'vejnavn'
  },
  normalizedField('husnr'),
  normalizedField('supplerendebynavn'),
  normalizedField('postnr'),
  {
    name: 'postnrnavn'
  },
  normalizedField('kommunekode'),
  {
    name: 'kommunenavn'
  },
  normalizedField('ejerlavkode'),
  normalizedField('ejerlavnavn'),
  normalizedField('matrikelnr'),
  normalizedField('esrejendomsnr'),
  normalizedField('etrs89koordinat_øst'),
  normalizedField('etrs89koordinat_nord'),
  normalizedField('wgs84koordinat_bredde'),
  normalizedField('wgs84koordinat_længde'),
  normalizedField('nøjagtighed'),
  normalizedField('kilde'),
  normalizedField('tekniskstandard'),
  normalizedField('tekstretning'),
  normalizedField('adressepunktændringsdato'),
  normalizedField('ddkn_m100'),
  normalizedField('ddkn_km1'),
  normalizedField('ddkn_km10'),
  {
    name: 'dagitemaer',
    multi: true
  },
  {
    name: 'geom_json'
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;