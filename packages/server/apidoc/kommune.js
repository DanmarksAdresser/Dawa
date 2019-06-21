const {
  autocompleteSubtext,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  reverseGeocodingParameters,
  strukturParameter,
  autocompleteParameter
} = require('./common');

const {
  dagiReplikeringTilknytningDoc,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('kommune');

const kommuneIdParameter = {
  name: 'kode',
  doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
  examples: ['0101']
};
const kommuneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i kommunenavnet. Alle ord i søgeteksten skal matche kommunenavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord.'
},
  autocompleteParameter,
  {
    name: 'navn',
    doc: 'Navnet på kommunen, f.eks. <em>Aarhus</em>',
    examples: ['Aarhus', 'København']
  },
  kommuneIdParameter,
  {
    name: 'regionskode',
    doc: 'Koden på den region, som kommunen er beliggende i'
  },
  {
    name: 'udenforkommuneinddeling',
    doc: 'Anvend udenforkommuneinddeling=false for at begrænse søgningen til ægte kommuner.'
  }];

module.exports = [
  {
    entity: 'kommune',
    path: '/kommuner',
    subtext: 'Søg efter kommuner. Returnerer de kommuner som opfylder kriteriet.',
    parameters: [
      ...kommuneParameters,
      ...dagiReverseParameters(temaModel),
      ...formatAndPagingParams,
      strukturParameter,
      ...dagiSridCirkelPolygonParameters('kommuner')],
    examples: [{
      description: 'Hent alle kommuner',
      query: []
    },
      {
        description: 'Find de kommuner, som starter med <em>aa</em>',
        query: [{name: 'q', value: "aa*"}]
      }]
  },
  {
    entity: 'kommune',
    path: '/kommuner/{kode}',
    subtext: 'Modtag kommune.',
    parameters: [kommuneIdParameter, strukturParameter],
    nomulti: true,
    examples: [{
      description: 'Hent Københavns kommune (kode 101)',
      path: ['/kommuner/101']
    }]
  },
  {
    entity: 'kommune',
    path: '/kommuner/autocomplete',
    subtext: autocompleteSubtext('kommuner'),
    parameters: [
      ...overwriteWithAutocompleteQParameter(kommuneParameters),
      ...formatAndPagingParams
    ],
    examples: [{
      description: 'Find alle kommuner som indeholder <em>8</em> (i kommunekoden).',
      query: [{name: 'q', value: '8'}]
    }]
  },
  {
    entity: 'kommune',
    path: '/kommuner/reverse',
    subtext: 'Modtage kommunen for det punkt der angives med x- og y-parametrene',
    parameters: [...reverseGeocodingParameters, strukturParameter],
    nomulti: true,
    examples: [
      {
        description: 'Returner kommunen for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [
          {name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'}
        ]
      },
      {
        description: 'Returner kommunen for punktet angivet af ETRS89/UTM32 koordinatet (6176652.55, 725369.59)',
        query: [
          {name: 'x', value: '725369.59'},
          {name: 'y', value: '6176652.55'},
          {name: 'srid', value: '25832'}
        ]
      }
    ]
  },
  ...dagiReplikeringTilknytningDoc(temaModel)
];
