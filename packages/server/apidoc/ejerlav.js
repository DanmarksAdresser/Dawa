const {
  autocompleteSubtext,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  strukturParameter,
  autocompleteParameter
} = require('./common');

const {
  replikeringDoc
} = require('./replikeringCommon');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');


const ejerlavKodeParameter = {
  name: 'kode',
  doc: 'Ejerlavets unikke kode. Repræsenteret ved indtil 7 cifre. Eksempel: ”170354” for ejerlavet ”Eskebjerg By, Bregninge”.',
  examples: ['170354', '80652']
};
const ejerlavParameters = [
  ejerlavKodeParameter,
  {
    name: 'navn',
    doc: 'Ejerlavets navn.',
    examples: ['Aarhus', 'København']
  },
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i ejerlavsnavnet. Alle ord i søgeteksten skal matche ejerlavsnavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. Der returneres højst 1000 resultater ved anvendelse af parameteren.'
  },
  autocompleteParameter
  ];

const ejerlavEventExamples =  [
  {
    description: 'Find alle ejerlavhændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
    query: [{
      name: 'sekvensnummerfra',
      value: '990'
    }, {
      name: 'sekvensnummertil',
      value: '1000'
    }]
  },
  {
    description: 'Find alle ejerlavhændelser for ejerlav med kode 20551',
    query: [{
      name: 'kode',
      value: '20551'
    }]
  }
];

const reverseParameters = [  {
  name: 'x',
  doc: 'Find ejerlavet for det angivne punkt. Både x- og y-parameter skal angives. Hvis ETRS89/UTM32 anvendes angives øst-værdien. Hvis WGS84/geografisk anvendes angives bredde-værdien.'
},
  {
    name: 'y',
    doc: 'Find ejerlavet for det angivne punkt. Både x- og y-parameter skal angives. Hvis ETRS89/UTM32 anvendes angives nord-værdien. Hvis WGS84/geografisk ' +
    'anvendes angives længde-værdien.'
  }
]

module.exports = [
  {
    entity: 'ejerlav',
    path: '/ejerlav',
    subtext: 'Søg efter ejerlav. Returnerer de ejerlav som opfylder kriteriet. <p>VIGTIGT: Der er udviklet en ny datamodel for matriklen, som er udstillet på <a href="https://datafordeler.dk">Datafordeleren</a>. DAWAs API er baseret en ældre datamodel, hvor data er konverteret tilbage fra den nye datamodel.</p>',
    parameters: [...ejerlavParameters, ...reverseParameters, ...dagiSridCirkelPolygonParameters('ejerlav'), strukturParameter, ...formatAndPagingParams],
    examples: [{description: 'Hent alle ejerlav', query: []},
      {
        description: 'Find ejerlav <em>80652</em>',
        query: [{name: 'kode', value: "80652"}]
      },
      {
        description: 'Find ejerlav med navn <em>Lynge By, Lynge</em>',
        query: [{name: 'navn', value: "Lynge By, Lynge"}]
      }]
  },
  {
    entity: 'ejerlav',
    path: '/ejerlav/{kode}',
    subtext: 'Modtag ejerlav med angivet kode.',
    parameters: [ejerlavKodeParameter, strukturParameter],
    nomulti: true,
    examples: [{
      description: 'Hent ejerlav 80652',
      path: ['/ejerlav/80652']
    }]
  },
  {
    entity: 'ejerlav',
    path: '/ejerlav/autocomplete',
    subtext: autocompleteSubtext('ejerlav'),
    parameters: overwriteWithAutocompleteQParameter([...ejerlavParameters, ...dagiSridCirkelPolygonParameters('ejerlav'), ...formatAndPagingParams]),
    examples: [{
      description: 'Find alle ejerlav som indeholder <em>by</em> i navnet',
      query: [{name: 'q', value: 'by'}]
    }]
  },
  ...replikeringDoc('ejerlav', [ejerlavKodeParameter], ejerlavEventExamples)
];
