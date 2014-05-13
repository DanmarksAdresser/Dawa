module.exports = {
  adgangsadresse: {
    name: 'adgangsadresse',
    table: 'adgangsadresser',
    columns: ['id', 'kommunekode', 'vejkode', 'husnr', 'supplerendebynavn', 'postnr', 'oprettet', 'aendret', 'ikraftfra', 'ejerlavkode', 'ejerlavnavn',
    'matrikelnr', 'esrejendomsnr', 'adgangspunktid', 'etrs89oest', 'etrs89nord', 'wgs84lat', 'wgs84long', 'noejagtighed', 'kilde', 'tekniskstandard', 'tekstretning',
    'kn100mdk', 'kn1kmdk', 'kn10kmdk', 'adressepunktaendringsdato'],
    key: ['id']
  },
  enhedsadresse: {
    name: 'enhedsadresse',
    table: 'enhedsadresser',
    columns: ['id', 'oprettet', 'aendret', 'ikraftfra', 'etage', 'doer', 'adgangsadresseid'],
    key: ['id']
  },
  postnummer: {
    name: 'postnummer',
    table: 'postnumre',
    columns: ['nr', 'navn', 'stormodtager'],
    key: ['nr']
  },
  vejstykke: {
    name: 'vejstykke',
    table: 'vejstykker',
    columns: ['kommunekode', 'kode', 'oprettet', 'aendret', 'vejnavn', 'adresseringsnavn'],
    key: ['kommunekode', 'kode']
  },
  supplerendebynavn: {
    name: 'supplerendebynavn',
    table: 'supplerendebynavne',
    columns: ['supplerendebynavn', 'kommunekode', 'postnr'],
    key: ['supplerendebynavn', 'kommunekode', 'postnr']
  }
};