module.exports = {
  relatedTable: `stednavne_divided`,
  relationTable: 'stednavne_adgadr',
  relationKey: ['stednavn_id'],
  relatedKey: ['id'],
  adgangsadresseIdColumn: 'adgangsadresse_id',
  useNearest: false,
  forceUnique: false

};