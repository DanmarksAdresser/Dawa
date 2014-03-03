"use strict";

var kode4String = require('./util').kode4String;
var dagiTemaer = require('./dagiTemaer');

/*
 * This file defines fields for all resource types. The way fields map to columns in the basequeries is
 * specified in columns.js .
 * Each field specifies:
 *  name: the name of the field
 *  formatter: (optional) A function that formats the field
 */

exports.adgangsadresse = [
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
    name: 'bygningsnavn'
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
    name: 'DDKN_m100'
  },
  {
    name: 'DDKN_km1'
  },
  {
    name: 'DDKN_km10'
  }
];

exports.adresse = [
  {
    name: 'id',
    column: 'e_id'
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
    name: 'postnr'
  },
  {
    name: 'postnrnavn'
  },
  {
    name: 'bygningsnavn'
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
    name: 'DDKN_m100'
  },
  {
    name: 'DDKN_km1'
  },
  {
    name: 'DDKN_km10'
  },
  {
    name: 'etage'
  },
  {
    name: 'dør'
  },
  {
    name: 'adgangsadresseid'
  }
];

exports.supplerendebynavn = [
  {
    name: 'navn'
  },
  {
    name: 'kommunekode'
  },
  {
    name: 'postnr'
  }
];

exports.vejnavn = [
  {
    name: 'navn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'kommunekode'
  }
];

exports.vejstykke = [
  {
    name: 'kode',
    formatter: kode4String
  },
  {
    name: 'kommunekode',
    formatter: kode4String
  },
  {
    name: 'navn'
  },
  {
    name: 'postnr'
  }
];

exports.postnummer = [
  {
    name: 'nr',
    formatter: kode4String
  },
  {
    name: 'navn'
  },
  {
    name: 'version'
  },
  {
    name: 'kommune'
  }
];

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = [
    {
      name: 'kode',
      formatter: kode4String
    },
    {
      name: 'navn'
    }
  ];
});