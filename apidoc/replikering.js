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
    subtext: `Modtag et komplet dataudtræk for en given entitet.`,
    parameters: [
      {
        name: 'entitet',
        doc: `Modtag et udtræk for den angivne entitet. Parameteren skal angives, man kan således
         kun hente udtræk for én entitet ad gangen. Eksempel: Hvis værdien 'adgangsadresse' angives
         modtages et udtræk af adgangsadresser. Se <a href="/dok/api/replikering-data">databeskrivelser</a>
         for mulige værdier.`
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
    subtext: 'Modtag hændelser om ændringer til en given entitet.',
    parameters: [
      {
        name: 'entitet',
        doc: `Modtag hændelser for den pågældende entitet (type). Parameteren skal angives, man kan
        således kun modtage hændelser for én entitet ad gangen. Eksempel: Hvis værdien
        'adgangsadresse' angives modtages hændelser for adgangsadresser. 
        Se <a href="/dok/api/replikering-data">databeskrivelser</a>
         for mulige værdier.`
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
    subtext: `Modtag metadata om udførte transaktioner, herunder transaktions-ID (txid) samt hvilke entiteter
    der er ændrede af transaktionen.`,
    parameters: [
      {
        name: 'txid',
        doc: 'Modtag transaktion med bestemt transaktionsid'
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
    subtext: 'Modtag metadata om den senest udførte transaktion herunder transaktions-ID.',
    parameters: [
      ...formatParameters
    ],
    examples:
      []
  },
  {
    path: '/replikering/datamodel',
    entity: 'replikering',
    subtext: `Modtag maskin-læsbar datamodel for alle de data, som udstilles på replikerings-API'et.`,
    parameters: [],
    examples: []
  }];