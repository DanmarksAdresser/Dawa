const {
  formatAndPagingParams,
  formatParameters
} = require('./common');

module.exports = [
  {
    entity: 'stednavntype',
    path: '/stednavntyper',
    subtext: 'Hent liste af hovedtyper for stednavne. For hver hovedtype returneres en liste af undertyper.',
    parameters: [
      {
        name: 'hovedtype',
        doc: 'Hent den angivne stednavntype'
      }].concat(formatAndPagingParams),
    examples: [
      {
        description: 'Hent alle stednavntyper',
        query: []
      }
    ]
  },
  {
    entity: 'stednavntype',
    path: '/stednavntyper/{hovedtype}',
    subtext: 'Hent en enkelt stednavnhovedtype',
    parameters: [
      {
        name: 'hovedtype',
        doc: 'Hovedtypen der ønskes, eksempelvis "Bebyggelse'
      }, ...formatParameters],
    examples: []
  }
];

