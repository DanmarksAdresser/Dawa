"use strict";

var _ = require('underscore');

var ddknSchemas = require('./ddknSchemas');
var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');
var nullableType = require('../schemaUtil').nullableType;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};

var normalizedDdknField = function(fieldName) {
  return _.findWhere(ddknSchemas, {name: fieldName});
}

var fields = [
  normalizedField('id'),
  {
    name: 'kvh',
    selectable: false
  },
  normalizedField('status'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  normalizedField('vejkode'),
  {
    name: 'vejnavn'
  },
  {
    name: 'adresseringsvejnavn'
  },
  normalizedField('husnr'),
  normalizedField('supplerendebynavn'),
  normalizedField('postnr'),
  {
    name: 'postnrnavn'
  },
  {
    name: 'stormodtagerpostnr'
  },
  {
    name: 'stormodtagerpostnrnavn'
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
  normalizedDdknField('ddkn_m100'),
  normalizedDdknField('ddkn_km1'),
  normalizedDdknField('ddkn_km10'),
  {
    name: 'regionskode'
  },
  {
    name: 'regionsnavn'
  },
  {
    name: 'jordstykke_ejerlavkode'
  },
  {
    name: 'jordstykke_matrikelnr'
  },
  {
    name: 'jordstykke_esrejendomsnr'
  },
  {
    name: 'jordstykke_ejerlavnavn'
  },
  normalizedField('højde'),
  {
    name: 'x'
  },
  {
    name: 'y'
  },
  {
    name: 'temaer',
    multi: true
  },
  {
    name: 'geom_json'
  },
  {
    name: 'bebyggelser',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
