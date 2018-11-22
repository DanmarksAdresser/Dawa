module.exports = {
  relatedTable: `jordstykker`,
  relationTable: 'jordstykker_adgadr',
  relationKey: ['ejerlavkode', 'matrikelnr'],
  relatedKey: ['ejerlavkode', 'matrikelnr'],
  adgangsadresseIdColumn: 'adgangsadresse_id',
  useNearest: false,
  forceUnique: true

};