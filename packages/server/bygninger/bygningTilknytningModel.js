module.exports = {
  relatedTable: `bygninger`,
  relationTable: 'bygningtilknytninger',
  relationKey: ['bygningid'],
  relatedKey: ['id'],
  adgangsadresseIdColumn: 'adgangsadresseid',
  useNearest: false,
  forceUnique: false
};