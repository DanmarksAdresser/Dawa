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
    name: 'oprettet'
  },
  {
    name: 'ændret'
  },
  {
    name: 'ikrafttrædelse'
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
    name: 'adressepunktændringsdato'
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

exports.adresse = [
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
    name: 'etage'
  },
  {
    name: 'dør'
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

exports.supplerendebynavn = [
  {
    name: 'navn'
  },
  {
    name: 'kommunekode'
  },
  {
    name: 'postnr'
  },
  {
    name: 'kommuner',
    multi: true
  },
  {
    name: 'postnumre',
    multi: true
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
  },{
    name: 'kommuner',
    multi: true
  },{
    name: 'postnumre',
    multi: true
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
    name: 'kommunenavn'
  },
  {
    name: 'navn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'postnumre',
    multi: true
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
  },
  {
    name: 'geom_json'
  },
  {
    name: 'kommuner',
    multi: true
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
    },
    {
      name: 'geom_json'
    }
  ];
});
