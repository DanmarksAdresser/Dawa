const {
  replikeringDoc
} = require('./replikeringCommon');

const eventParams = [
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },
  {
    name: 'vejkode',
    doc: 'vejkode. 4 cifre.',
    examples: ['0052']
  },
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['8000']
  }];

module.exports = replikeringDoc('vejstykkepostnummerrelation', eventParams, []);
