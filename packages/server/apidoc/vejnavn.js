const {
  autocompleteSubtext,
  formatAndPagingParams,
  fuzzyParameter,
  overwriteWithAutocompleteQParameter,
  autocompleteParameter
} = require('./common');

const vejnavneIdParameter = {
  name: 'navn',
  doc: "Vejnavn. Der skelnes mellem store og små bogstaver.",
  examples: ['Margrethepladsen', 'Viborgvej']
};

const vejnavneParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejnavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. ' +
    'Der skelnes ikke mellem store og små bogstaver.',
  examples: ['tværvej']},
  autocompleteParameter,
  fuzzyParameter,

  vejnavneIdParameter,

  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },

  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  }];

module.exports = [
  {
    entity: 'vejnavn',
    path: '/vejnavne',
    subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
    parameters: vejnavneParameters.concat(formatAndPagingParams),
    examples: [{
      description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og ' +
        'indeholder et ord der starter med <em>hvid</em>',
      query: [{name: 'postnr', value: '2400'},
        {name: 'q', value: 'hvid*'}]
    },
      {
        description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
        query: [{name: 'kommunekode', value: '0101'}]
      }]
  },
  {
    entity: 'vejnavn',
    path: '/vejnavne/{navn}',
    subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
    parameters: [vejnavneIdParameter],
    nomulti: true,
    examples: [{
      description: 'Hent information om vejnavnet <em>Gammel Viborgvej</em>',
      path: ['/vejnavne/Gammel%20Viborgvej']
    }]
  },
  {
    entity: 'vejnavn',
    path: '/vejnavne/autocomplete',
    subtext: autocompleteSubtext('vejnavne'),
    parameters: overwriteWithAutocompleteQParameter(vejnavneParameters).concat(formatAndPagingParams),
    examples: [{
      description: 'Find alle vejnavne som indeholder <em>jolle</em>',
      query: [{name: 'q', value: 'jolle'}]
    },
      {
        description: 'Find alle vejnavne som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
        query: [{name: 'q', value: 'strand '}]
      }]
  }
];
