module.exports = [{
  relatedTable: `steder_divided`,
  relationTable: 'stedtilknytninger',
  relationKey: ['stedid'],
  relatedKey: ['id'],
  adgangsadresseIdColumn: 'adgangsadresseid',
  useNearest: false,
  forceUnique: false
}];