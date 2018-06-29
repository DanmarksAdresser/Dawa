"use strict";

const _ = require('underscore');
var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');
const adgangsadresseFields = require('../adgangsadresse/fields');

var util = require('../util');
var kode4String = util.kode4String;
var d = util.d;

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adresse', fieldName);
};

var normalizedAdgangsadresseField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('adgangsadresse', fieldName);
};
const adgangsadresseField = fieldName => _.findWhere(adgangsadresseFields, {name: fieldName});


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
    name: 'adgangspunktid'
  },
  {
    name: 'x'
  },
  {
    name: 'y'
  },
  {
    name: 'vejpunkt_x'
  },
  {
    name: 'vejpunkt_y'
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
    name: 'adgangspunkt_geom_json'
  },
  {
    name: 'vejpunkt_geom_json'
  },
  {
    name: 'geom_json'
  },
  adgangsadresseField('sognekode'),
  {
    name: 'sognenavn'
  },
  adgangsadresseField('politikredskode'),
  {
    name: 'politikredsnavn'
  },
  adgangsadresseField('retskredskode'),
  {
    name: 'retskredsnavn'
  },
  adgangsadresseField('opstillingskredskode'),
  {
    name: 'opstillingskredsnavn'
  },
  adgangsadresseField('zone'),
  adgangsadresseField('afstemningsområdenummer'),
  adgangsadresseField('afstemningsområdenavn'),
  adgangsadresseField('menighedsrådsafstemningsområdenummer'),
  adgangsadresseField('menighedsrådsafstemningsområdenavn'),
  adgangsadresseField('brofast'),
  adgangsadresseField('supplerendebynavn_dagi_id'),
  adgangsadresseField('navngivenvej_id')

];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports = fields;
