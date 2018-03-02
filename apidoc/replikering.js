"use strict";

const {
  formatParameters,
  formatAndPagingParams
} = require('./common');

module.exports = [  {
  path: '/replikering/transaktioner',
  entity: 'transaktion',
  subtext: 'Transaktioner indeholder information om ændrede entiter.',
  parameters: [
    {
      name: 'txid',
      doc: 'Find transaktion med bestemt transaktionsid'
    },
    {
      name: 'txidfra',
      doc: 'Find transaktioner med txid større end eller lig den angivne værdi. Anvendes typisk sammen med txidtil parameteren.'
    },
    {
      name: 'txidtil',
      doc: 'Find trasaktioner med txid mindre end eller lig den angivne værdi.'
    },
    ...formatAndPagingParams
  ],
  examples:
    []
},
  {
    path: '/replikering/senestetransaktion',
    entity: 'transaktion',
    subtext: 'Hent den senest udførte transaktion.',
    parameters: [
      ...formatParameters
    ],
    examples:
      []
  }];