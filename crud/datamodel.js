module.exports = {
  adgangsadresse: {
    table: 'adgangsadresser',
    columns: ['id', 'kommunekode', 'vejkode', 'husnr', 'supplerendebynavn', 'postnr'],
    key: ['id']
  },
  enhedsadresse: {
    table: 'enhedsadresser',
    columns: ['id', 'etage', 'doer', 'adgangsadresseid'],
    key: ['id']
  },
  postnummer: {
    table: 'postnumre',
    columns: ['nr', 'navn'],
    key: ['nr']
  },
  vejstykke: {
    table: 'vejstykker',
    columns: ['kommunekode', 'kode', 'vejnavn'],
    key: ['kommunekode', 'kode']
  }
};