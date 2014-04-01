"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var util = require('../util');
var kode4String = util.kode4String;
var d = util.d;

var fields = [
  {
    name: 'id'
  },
  {
    name: 'oprettet',
    formatter: d
  },
  {
    name: 'ændret',
    formatter: d
  },
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
  {
    name: 'supplerendebynavn'
  },
  {
    name: 'postnr',
    formatter: kode4String
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
    name: 'adressepunktændringsdato',
    formatter: d
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