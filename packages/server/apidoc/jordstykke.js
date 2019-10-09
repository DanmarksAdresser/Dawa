const {
  formatAndPagingParams,
  pagingParameters,
  reverseGeocodingParameters,
  strukturParameter,
  autocompleteParameter
} = require('./common');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');

const {
  replikeringDoc
} = require('./replikeringCommon');

const commonParameters = [
  {
    name: 'ejerlavkode',
    doc: 'Find jordstykker tilhørende ejerlav med den angivne kode.',
    examples: ['170354', '80652']
  },
  {
    name: 'matrikelnr',
    doc: 'Find jordstykker med det angivne matrikelnr.',
    examples: ['7kn', '5bv']
  },
  {
    name: 'kommunekode',
    doc: 'Find de jordstykker som ligger indenfor kommunen angivet ved kommunekoden.'
  },
  {
    name: 'regionskode',
    doc: 'Find de jordstykker som ligger indenfor regionen angivet ved regionkoden.'
  },
  {
    name: 'sognekode',
    doc: 'Find de jordstykker som ligger indenfor sognet angivet ved sognkoden.'
  },
  {
    name: 'retskredskode',
    doc: 'Find de jordstykker som ligger indenfor retskredsen angivet ved retskredskoden.'
  },
  {
    name: 'esrejendomsnr',
    doc: 'Find de jordstykker som er tilknyttet det angivne ESR ejendomsnummer.'
  },
  {
    name: 'udvidet_esrejendomsnr',
    doc: 'Find de jordstykker som er tilknyttet det angivne udvidede ESR ejendomsnummer (10 cifre)'
  },
  {
    name: 'sfeejendomsnr',
    doc: 'Find de jordstykker som er tilknyttet det angivne SFE ejendomsnummer.'
  },
  {
    name: 'featureid',
    doc: 'Find jordstykker med den angivne featureid'
  },
  {
    name: 'moderjordstykke',
    doc: 'Find jordstykker, hvor moderjordstykket er jordstykket med det angivne featureid'
  },
  {
    name: 'bfenummer',
    doc: 'Find jordstykker med det angivne bfenummer'
  }
];

const searchParameter = {
  name: 'q',
  doc: 'Tekstsøgning efter jordstykker. Der søges i matrikelnr, ejerlavnavn og ejerlavkode.'
};
const autocompleteSearchParameter = {
  name: 'q',
  doc: 'Autocomplete-tekst efter jordstykker. Der søges i matrikelnr, ejerlavnavn og ejerlavkode.'
};

const reverseParameters = [
   {
    name: 'x',
    doc: 'Find jordstykket for det angivne punkt. Både x- og y-parameter skal angives. Hvis ETRS89/UTM32 anvendes angives øst-værdien. Hvis WGS84/geografisk anvendes angives bredde-værdien.'
  },
  {
    name: 'y',
    doc: 'Find jordstykket for det angivne punkt. Både x- og y-parameter skal angives. Hvis ETRS89/UTM32 anvendes angives nord-værdien. Hvis WGS84/geografisk ' +
    'anvendes angives længde-værdien.'
  }
];

const jordstykkeIdParameters = [
  {
    name: 'ejerlavkode',
    doc: 'Jordstykkets ejerlavkode.',
    examples: ['170354', '80652']
  },
  {
    name: 'matrikelnr',
    doc: 'Jordstykkets matrikelnr.',
    examples: ['7kn', '5bv']
  }
];

const eventParams = [{
  name: 'adgangsadresseid',
  doc: 'Adgangsadressens unikke id, f.eks. 0a3f5095-45ec-32b8-e044-0003ba298018.'
},   {
  name: 'ejerlavkode',
  doc: 'Jordstykkets ejerlavkode.',
  examples: ['170354', '80652']
},
  {
    name: 'matrikelnr',
    doc: 'Jordstykkets matrikelnr.',
    examples: ['7kn', '5bv']
  }
];


module.exports = [
  {
    entity: 'jordstykke',
    path: '/jordstykker',
    subtext: 'Søg efter jordstykker. Returnerer de jordstykker som opfyler søgekriterierne.',
    parameters: [searchParameter, autocompleteParameter, ...commonParameters, ...reverseParameters, ...formatAndPagingParams, ...dagiSridCirkelPolygonParameters('jordstykker'), strukturParameter],
    examples: [{description: 'Hent alle jordstykker', query: []},
      {
        description: 'Find jordstykker for ejerlav med kode <em>80652</em>',
        query: [{name: 'ejerlavkode', value: "80652"}]
      },
      {
        description: 'Find jordstykket med ejerlavkode <em>100453</em> og matrikelnr <em>8bd</em>',
        query: [{name: 'ejerlavkode', value: '100453'}, {name: 'matrikelnr', value: '8bd'}]
      }]
  },
  {
    entity: 'jordstykke',
    path: '/jordstykker/{ejerlavkode}/{matrikelnr}',
    subtext: 'Modtag jordstykket med den angivne ejerlavkode og matrikelnr',
    parameters: jordstykkeIdParameters.concat([strukturParameter]),
    nomulti: true,
    examples: [{
      description: 'Hent jordstykket med ejerlavkode <em>100453</em> og matriklenr <em>8bd</em>',
      path: ['/jordstykker/100453/8bd']
    }]
  },
  {
    entity: 'jordstykke',
    path: '/jordstykker/autocomplete',
    subtext: 'Autocomplete af jordstykker.',
    parameters: [autocompleteSearchParameter, autocompleteParameter, ...commonParameters, ...dagiSridCirkelPolygonParameters('jordstykker'), ...pagingParameters],
    nomulti: true,
    examples: []
  },
  {
    entity: 'jordstykke',
    path: '/jordstykker/reverse',
    subtext: 'Modtage jordstykket for det punkt der angives med x- og y-parametrene',
    parameters: reverseGeocodingParameters.concat([strukturParameter]),
    nomulti: true,
    examples: [
      {
        description: 'Returner jordstykket for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
        query: [
          {name: 'x', value: '12.5851471984198'},
          {name: 'y', value: '55.6832383751223'}
        ]
      },
      {
        description: 'Returner jordstykket for punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
        query: [
          {name: 'x', value: '725369.59'},
          {name: 'y', value: '6176652.55'},
          {name: 'srid', value: '25832'}]
      }
    ]
  },
  ...replikeringDoc('jordstykketilknytning', eventParams, []),
];
