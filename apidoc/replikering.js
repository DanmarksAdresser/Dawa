"use strict";

const {
  formatParameters,
  formatAndPagingParams
} = require('./common');

const {
  txidIntervalDoc,
  sekvensnummerIntervalDoc,
  tidspunktIntervalDoc
} = require('./replikeringCommon');

module.exports = [
  {
    path: '/replikering/udtraek',
    entity: 'udtraek',
    subtext: 'Komplette dataudtræk',
    parameters: [
      {
        name: 'entitet',
        doc: `Modtag et udtræk for den angivne entitet. Parameteren skal angives, man kan således
         kun hente udtræk for én entitet ad gangen. Eksempel: Hvis værdien 'adgangsadresse' angives
         modtages et udtræk af adgangsadresser.`
      },
      {
      name: 'txid',
      doc: 'Hent udtrækket med det angivne Transaktions-ID. Alle ændringer som er udført på' +
      ' data i den angivne og tidligere transaktioner vil være med i udtrækket, og ' +
      ' alle ændringer gennemført i senere transaktioner vil ikke være med.' +
      ' Et udtræk med et givent transaktions-ID er således et snapshot af data dannet præcis efter' +
      ' udførelsen af transaktionen med den angivne transaktions-ID.'
    },
      {
        name: 'sekvensnummer',
        doc: 'Hent udtrækket med det angivne sekvensnummer. Alle ændringer til og med dette sekvensnummer' +
        ' er med i udtrækket, og alle senere ændringer er ikke med. Det anbefales at nye klienter anvender ' +
        ' txid parameteren i stedet.'
      }],
    examples: []
  },
  {
    path: '/replikering/haendelser',
    entity: 'haendelse',
    subtext: 'Modtag hændelser om ændringer til data',
    parameters: [
      {
        name: 'entitet',
        doc: `Modtag hændelser for den pågældende entitet (type). Parameteren skal angives, man kan
        således kun modtage hændelser for én entitet ad gangen. Eksempel: Hvis værdien
        'adgangsadresse' angives modtages hændelser for adgangsadresser.`
      },
      ...txidIntervalDoc,
      ...sekvensnummerIntervalDoc,
      ...tidspunktIntervalDoc
    ],
    examples: []
  },
  {
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
        doc: 'Find transaktioner med txid mindre end eller lig den angivne værdi.'
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