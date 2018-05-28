"use strict";

var _ = require('underscore');

var ddknSchemas = require('./ddknSchemas');
var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');
var nullableType = require('../schemaUtil').nullableType;
const util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const kode4String = util.kode4String;

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
    name: 'stormodtagerpostnr',
    formatter: kode4String
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
    name: 'regionskode',
    formatter: kode4String
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
    name: 'jordstykke_esrejendomsnr',
    formatter: util.numberToString
  },
  {
    name: 'jordstykke_ejerlavnavn'
  },
  normalizedField('højde'),
  normalizedField('adgangspunktid'),
  {
    name: 'x'
  },
  {
    name: 'y'
  },
  {
    name: 'adgangspunkt_geom_json'
  },
  {
    name: 'bebyggelser',
    multi: true
  },
  {
    name: 'vejpunkt_id'
  },
  {
    name: 'vejpunkt_kilde'
  },
  {
    name: 'vejpunkt_nøjagtighed'
  },
  {
    name: 'vejpunkt_tekniskstandard'
  },
  {
    name: 'vejpunkt_geom_json'
  },
  {
    name: 'geom_json'
  },
  {
    name: 'vejpunkt_x'
  },
  {
    name: 'vejpunkt_y'
  },
  {
    name: 'sognekode',
    formatter: kode4String
  },
  {
    name: 'sognenavn'
  },
  {
    name: 'politikredskode',
    formatter: kode4String

  },
  {
    name: 'politikredsnavn'
  },
  {
    name: 'retskredskode',
    formatter: kode4String
  },
  {
    name: 'retskredsnavn'
  },
  {
    name: 'opstillingskredskode',
    formatter: kode4String
  },
  {
    name: 'opstillingskredsnavn'
  },
  {
    name: 'zone',
    formatter: util.zoneKodeFormatter
  },
  {
    name: 'afstemningsområdenummer',
    formatter: util.numberToString
  },
  {
    name: 'afstemningsområdenavn'
  },
  {
    name: 'brofast'
  },
  normalizedField('supplerendebynavn_dagi_id'),
  normalizedField('navngivenvej_id')
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
