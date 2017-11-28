const {
  autocompleteSubtext,
  formatParameters,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter
} = require('./common');
const {
  dagiNavnParameter,
  dagiQParameter,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('storkreds');

const nummerParameter = {
  name: 'nummer',
  doc: 'Storkredsens nummer.'
};
const storkredsParameters = [
  nummerParameter,
  dagiNavnParameter(temaDef),
  dagiQParameter(),
  ...dagiSridCirkelPolygonParameters(temaDef.plural)
];

const examples = {
  query: [{
    description: 'Find alle Storkredse som starter med Midt',
    query: [{
      name: 'q',
      value: 'Midt*'
    }]
  }, {
    description: 'Returner alle storkredse',
    query: {}
  }],
  get: [{
    description: 'Returner oplysninger om storkredsen København',
    path: ['/storkredse/1']
  }, {
    description: 'Returnerer oplysninger om storkredsen København i GeoJSON format',
    path: ['/storkredse/1'],
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: [{
    description: 'Find oplysninger om alle storkredse der starter med Nord',
    query: [{
      name: 'q',
      value: 'Nord'
    }]
  }]
};

module.exports = [
  {
    entity: 'storkreds',
    path: '/storkredse',
    subtext: 'Søg efter storkredse. Returnerer de storkredse der opfylder kriteriet.',
    parameters: storkredsParameters.concat(dagiReverseParameters(temaDef)).concat(formatAndPagingParams),
    examples: examples.query
  },
  {
    entity: 'storkreds',
    path: '/storkredse/{nummer}',
    subtext: 'Modtag storkreds ud fra nummer.',
    parameters: [
      nummerParameter,
      ...formatParameters
    ],
    nomulti: true,
    examples: examples.get
  },
  {
    entity: 'storkreds',
    path: '/storkredse/autocomplete',
    subtext: autocompleteSubtext(temaDef.plural),
    parameters: [
      ...overwriteWithAutocompleteQParameter(storkredsParameters),
      ...formatAndPagingParams],
    examples: examples.autocomplete || []
  },
  dagiReverseDoc(temaDef),
  ...  dagiReplikeringTilknytningDoc(temaDef)
];
