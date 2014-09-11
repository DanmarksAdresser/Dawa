"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');
var nullableType = require('../schemaUtil').nullableType;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};

var fields = [
  normalizedField('id'),
  normalizedField('status'),
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
  {
    name: 'ejerlavnavn'
  },
  normalizedField('matrikelnr'),
  normalizedField('esrejendomsnr'),
  normalizedField('etrs89koordinat_øst'),
  normalizedField('etrs89koordinat_nord'),
  {
    name: 'wgs84koordinat_bredde',
    description: 'Adgangspunktets breddegrad angivet i koordinatsystemet WGS84/geografisk',
    schema: {
      type: nullableType('number')
    }
  },
  {
    name: 'wgs84koordinat_længde',
    description: 'Adgangspunktets længdegrad angivet i koordinatsystemet WGS84/geografisk',
    schema: {
      type: nullableType('number')
    }
  },
  normalizedField('nøjagtighed'),
  normalizedField('kilde'),
  normalizedField('tekniskstandard'),
  normalizedField('tekstretning'),
  normalizedField('adressepunktændringsdato'),
  normalizedField('ddkn_m100'),
  normalizedField('ddkn_km1'),
  normalizedField('ddkn_km10'),
  {
    name: 'temaer',
    multi: true
  },
  {
    name: 'geom_json'
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;