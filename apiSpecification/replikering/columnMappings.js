"use strict";

// maps of field names to database column names

module.exports = {
  vejstykke: [{
    name: 'kode'
  }, {
    name: 'kommunekode'
  }, {
    name: 'navn',
    column: 'vejnavn'
  }, {
    name: 'adresseringsnavn'
  }, {
    name: 'oprettet'
  }, {
    name: 'ændret',
    column: 'aendret'
  }],
  postnummer: [{
    name: 'nr'
  }, {
    name: 'navn'
  },{
    name: 'stormodtager'
  }],
  adgangsadresse: [{
    name: 'id'
  }, {
    name: 'kommunekode'
  },{
    name: 'vejkode'
  }, {
    name: 'husnr'
  }, {
    name: 'supplerendebynavn'
  }, {
    name: 'postnr'
  }, {
    name: 'oprettet'
  }, {
    name: 'ændret',
    column: 'aendret'
  }, {
    name: 'ikrafttrædelsesdato',
    column: 'ikraftfra'
  }, {
    name: 'ejerlavkode'
  }, {
    name: 'ejerlavnavn'
  }, {
    name: 'matrikelnr'
  }, {
    name: 'esrejendomsnr'
  }, {
    name: 'etrs89koordinat_øst',
    column: 'etrs89oest'
  }, {
    name: 'etrs89koordinat_nord',
    column: 'etrs89nord'
  }, {
    name: 'wgs84koordinat_længde',
    column: 'wgs84long'
  }, {
    name: 'wgs84koordinat_bredde',
    column: 'wgs84lat'
  }, {
    name: 'nøjagtighed',
    column: 'noejagtighed'
  }, {
    name: 'kilde'
  }, {
    name: 'tekniskstandard'
  }, {
    name: 'tekstretning'
  }, {
    name: 'adressepunktændringsdato',
    column: 'adressepunktaendringsdato'
  }, {
    name: 'ddkn_m100',
    column: 'kn100mdk'
  }, {
    name: 'ddkn_km1',
    column: 'kn1kmdk'
  }, {
    name: 'ddkn_km10',
    column: 'kn10kmdk'
  }
  ],
  adresse: [{
    name: 'id'
  }, {
    name: 'oprettet'
  }, {
    name: 'ændret',
    column: 'aendret'
  }, {
    name: 'ikrafttrædelsesdato',
    column: 'ikraftfra'
  }, {
    name: 'etage'
  }, {
    name: 'dør',
    column: 'doer'
  }, {
    name: 'adgangsadresseid'
  }
  ]
};

