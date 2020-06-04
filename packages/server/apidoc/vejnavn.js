const {
  autocompleteSubtext,
  formatAndPagingParams,
  fuzzyParameter,
  overwriteWithAutocompleteQParameter,
  autocompleteParameter,
  strukturParameter
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
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune. Af hensyn til bagudkompatibilitet påvirker parameteren også hvilke postnumre, der returneres for hvert vejnavn. Kun postnumre indenfor den angivne kommune medtages.',
    examples: ['0101']
  },

  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  },
  {
    name: 'polygon',
    doc: 'Find de vejnavne, hvor vejens geometri overlapper det angivne polygon. ' +
      'Polygonet specificeres som et array af koordinater på samme måde som' +
      ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
      ' Bemærk at polygoner skal' +
      ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
      ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
      ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
      ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].'
  },
  {
    name: 'cirkel',
    doc: `Find de vejnavne, hvor vejens geometri overlapper cirklen angivet af koordinatet (x,y) og radius r. 
    Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk.
    Radius angives i meter. cirkel={x},{y},{r}.`
  }];

module.exports = [
  {
    entity: 'vejnavn',
    path: '/vejnavne',
    subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
    parameters: [...vejnavneParameters, strukturParameter, ...formatAndPagingParams],
    examples: [{
      description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og ' +
        'indeholder et ord der starter med <em>hvid</em>',
      query: [{name: 'postnr', value: '2400'},
        {name: 'q', value: 'hvid*'}]
    },
      {
        description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
        query: [{name: 'kommunekode', value: '0101'}]
      },
      { 
        description: 'Fuzzy søgning efter Rante mestervej', 
        query: [{name: 'q', value: 'Rante mestervej'}, {name: 'fuzzy', value: ''}]
      }]
  },
  {
    entity: 'vejnavn',
    path: '/vejnavne/{navn}',
    subtext: 'Søg efter vejnavne. Returnerer de vejnavne som opfylder kriteriet.',
    parameters: [vejnavneIdParameter, strukturParameter],
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
    parameters: [...overwriteWithAutocompleteQParameter(vejnavneParameters), ...formatAndPagingParams],
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
