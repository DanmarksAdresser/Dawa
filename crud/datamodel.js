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
  postnummer: {
    name: 'postnummer',
    table: 'postnumre',
    columns: ['nr', 'navn', 'stormodtager'],
    key: ['nr']
  },
  vejstykke: {
    name: 'vejstykke',
    table: 'vejstykker',
    columns: ['kommunekode', 'kode', 'oprettet', 'aendret', 'vejnavn', 'adresseringsnavn', 'navngivenvej_id'],
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
  },
  bebyggelsestilknytning: {
    name: 'bebyggelsestilknytning',
    table: 'bebyggelser_adgadr',
    columns: ['bebyggelse_id', 'adgangsadresse_id'],
    key: ['bebyggelse_id', 'adgangsadresse_id']
  },
  navngivenvej: {
    name: 'navngivenvej',
    table: 'navngivenvej',
    columns: ['id', 'darstatus', 'oprettet',
      'ændret', 'navn', 'adresseringsnavn', 'administreresafkommune',
    'beskrivelse', 'retskrivningskontrol', 'udtaltvejnavn'],
    key: ['id']
  },
  jordstykketilknytning: {
    name: 'jordstykketilknytning',
    table: 'jordstykker_adgadr',
    columns: ['ejerlavkode', 'matrikelnr', 'adgangsadresse_id'],
    key: ['ejerlavkode', 'matrikelnr', 'adgangsadresse_id']
  },
  vejstykkepostnummerrelation: {
    name: 'vejstykkepostnummerrelation',
    table: 'vejstykkerpostnumremat',
    columns: ['kommunekode', 'vejkode', 'postnr'],
    key: ['kommunekode', 'vejkode', 'postnr']
  },
  vejpunkt: {
    name: 'vejpunkt',
    table: 'vejpunkter',
    columns: ['id', 'husnummerid', 'kilde', 'noejagtighedsklasse', 'tekniskstandard', 'geom'],
    key: ['id']
  },
  stednavntilknytning: {
    name: 'stednavntilknytning',
    table: 'stednavne_adgadr',
    columns: ['stednavn_id', 'adgangsadresse_id'],
    key: ['stednavn_id', 'adgangsadresse_id']
  }
};
