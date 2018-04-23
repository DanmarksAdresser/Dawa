module.exports = {
  adgangsadresse: {
    name: 'adgangsadresse',
    table: 'adgangsadresser',
    columns: ['id', 'kommunekode', 'vejkode', 'husnr', 'supplerendebynavn', 'postnr', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'ejerlavkode',
    'matrikelnr', 'esrejendomsnr', 'adgangspunktid', 'etrs89oest', 'etrs89nord', 'noejagtighed', 'adgangspunktkilde', 'husnummerkilde', 'placering', 'tekniskstandard', 'tekstretning',
      'esdhreference', 'journalnummer', 'adressepunktaendringsdato', 'hoejde', 'navngivenvej_id'],
    key: ['id']
  },
  adresse: {
    name: 'adresse',
    table: 'enhedsadresser',
    columns: ['id', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'etage', 'doer', 'adgangsadresseid',
      'kilde', 'esdhreference', 'journalnummer'],
    key: ['id']
  },
  vejstykke: {
    name: 'vejstykke',
    table: 'vejstykker',
    columns: ['kommunekode', 'kode', 'oprettet', 'aendret', 'vejnavn', 'adresseringsnavn', 'navngivenvej_id'],
    key: ['kommunekode', 'kode']
  }
};
