const {
  formatAndPagingParams
} = require('./common');

module.exports = [
  {
    entity: 'autocomplete',
    path: '/autocomplete',
    subtekst: 'Samlet autocomplete-funktionalitet for vejnavne, adgangsadresser og adresser. ',
    parameters: [{
      name: 'type',
      doc: 'Angiver, om brugeren er ved at indtaste et vejnavn, en adgangsadresse eller en adresse.' +
      ' Mulige værdier: "vejnavn", "adgangsadresse" eller "adresse". De returnerede værdier er ikke nødvendigvis af' +
      ' denne type. Hvis brugeren f.eks. er ved at indtaste en adresse, men ikke har indtastet nok til at vejnavnet er entydigt ' +
      ' bestemt, så vil servicen returnere vejnavne som valgmuligheder for brugeren'
    }, {
      name: 'startfra',
      doc: 'Autocomplete søger igennem vejnavne, adgangsadresser og adresser. Som udgangspunkt returneres' +
      ' den første type, der giver mere end ét resultat. Med startfra parameteren angives, at søgningen skal' +
      ' starte senere i rækken. Hvis man f.eks. ikke ønsker, at der kan returneres vejnavne, angives startfra=adgangsadresse, og' +
      ' man vil få adgangsadresser tilbage, selvom mere end et vejnavn matcher søgningen. Parameteren er tiltænkt' +
      ' den situation, hvor brugeren vælger et vejnavn blandt de muligheder, som autocomplete-komponenten viser.' +
      ' I denne situation forventer brugeren, at der autocomplete-komponenten efterfølgende viser adgangsadresser. Ved at angive startfra=adgangsadresse' +
      ' sikres dette. Mulige værdier for parameteren: "vejnavn" (default), "adgangsadresse", "adresse"'
    }, {
      name: 'q',
      doc: 'Søgetekst - den tekst brugeren har indtastet'
    }, {
      name: 'caretpos',
      doc: 'Position af careten (cursoren) i den tekst brugeren har indtastet'
    }, {
      name: 'postnr',
      doc: 'Begræns søgning til det angivne postnummer'
    }, {
      name: 'kommunekode',
      doc: 'Begræns søgning til adresser indenfor den angivne kommune'
    }, {
      name: 'adgangsadresseid',
      doc: 'Begræns søgning til adresser med den angivne adgangsadresseid'
    }, {
      name: 'multilinje',
      doc: 'Angiver, om forslag formateres med linjeskift. Mulige værdier: true eller false. Default false.'
    }, {
      name: 'supplerendebynavn',
      doc: 'Angiver, om adresser formateres med supplerende bynavn. Mulige værdier: true eller false. Default true.'
    }, {
      name: 'stormodtagerpostnumre',
      doc: 'Angiver, om der returneres forslag med stormodtagerpostnumre. Mulige værdier: true eller false. ' +
      'Default false. Bemærk, at hvis stormodtagerpostnumre aktiveres, ' +
      'så kan samme adresse optræde to gange i listen af forslag.'
    }, {
      name: 'fuzzy',
      doc: 'Aktiver fuzzy søgning'
    }, {
      name: 'id',
      doc: 'Returner adresse eller adgangsadresse med den angivne ID. type-parameteren afgør, om der søges' +
      ' efter adgangsadresser eller adresser. Der returneres en tom array hvis (adgangs)adressen ikke findes.'
    }].concat(formatAndPagingParams),
    examples: [
      {
        description: 'Autocomplete "Magreteplasen 4, 8" med fuzzy søgning slået til og careten placeret i slutningen af teksten',
        query: [
          {name: 'q', value: 'Magreteplasen 4, 8'},
          {name: 'caretpos', value: 'Magreteplasen 4, 8'.length},
          {name: 'fuzzy', value: ''}]
      },
      {
        description: 'Autocomplete "Marg 4, 8000 Aarhus C" med careten placeret efter "Marg"',
        query: [
          {name: 'q', value: 'Marg 4, 8000 Aarhus C'},
          {name: 'caretpos', value: "4"}
        ]
      }
    ]
  }
];
