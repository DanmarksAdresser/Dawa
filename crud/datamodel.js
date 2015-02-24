module.exports = {
  adgangsadresse: {
    name: 'adgangsadresse',
    table: 'adgangsadresser',
    columns: ['id', 'kommunekode', 'vejkode', 'husnr', 'supplerendebynavn', 'postnr', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'ejerlavkode',
    'matrikelnr', 'esrejendomsnr', 'adgangspunktid', 'etrs89oest', 'etrs89nord', 'noejagtighed', 'kilde', 'tekniskstandard', 'tekstretning',
    'adressepunktaendringsdato'],
    key: ['id']
  },
  adresse: {
    name: 'adresse',
    table: 'enhedsadresser',
    columns: ['id', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'etage', 'doer', 'adgangsadresseid'],
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
  },
  ejerlav: {
    name: 'ejerlav',
    table: 'ejerlav',
    columns: ['kode', 'navn'],
    key: ['kode']
  },
  adgangsadresse_tema: {
    name: 'adgangsadresse_tema',
    table: 'adgangsadresser_temaer_matview',
    columns: ['adgangsadresse_id', 'tema', 'tema_id'],
    key: ['adgangsadresse_id', 'tema', 'tema_id']
  }
};