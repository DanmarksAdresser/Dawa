"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var kode4String = require('../util').kode4String;

var fields = [
  {
    name: 'id'
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
    name: 'etage'
  },
  {
    name: 'dør'
  },
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
    name: 'adressepunktændringsdato'
  },
  {
    name: 'geom_json'
  },
  {
    name: 'adgangsadresseid'
  },
  {
    name: 'adgangsadresse_oprettet'
  },
  {
    name: 'adgangsadresse_ændret'
  },
  {
    name: 'adgangsadresse_ikrafttrædelse'
  },
  {
    name: 'dagitemaer',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;