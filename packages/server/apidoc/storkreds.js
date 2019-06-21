const {
  autocompleteSubtext,
  formatParameters,
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  strukturParameter,
  autocompleteParameter
} = require('./common');
const {
  dagiNavnParameter,
  dagiQParameter,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('storkreds');

const nummerParameter = {
  name: 'nummer',
  doc: 'Storkredsens nummer.'
};
const storkredsParameters = [
  nummerParameter,
  dagiNavnParameter(temaModel),
  dagiQParameter(),
  autocompleteParameter,
  {
    name: 'valglandsdelsbogstav',
    doc: 'Find storkredsene i den angivne valglandsdel.'
  },
  {
    name: 'regionskode',
    doc: 'Find storkredsene i regionen med den angivne regionskode.'
  }
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
    parameters: [...storkredsParameters,
      ...dagiReverseParameters(temaModel),
      ...dagiSridCirkelPolygonParameters(temaModel.plural),
      ...formatAndPagingParams, strukturParameter],
    examples: examples.query
  },
  {
    entity: 'storkreds',
    path: '/storkredse/{nummer}',
    subtext: 'Modtag storkreds ud fra nummer.',
    parameters: [
      nummerParameter,
      ...formatParameters,
      strukturParameter
    ],
    nomulti: true,
    examples: examples.get
  },
  {
    entity: 'storkreds',
    path: '/storkredse/autocomplete',
    subtext: autocompleteSubtext(temaModel.plural),
    parameters: [
      ...overwriteWithAutocompleteQParameter(storkredsParameters),
      ...formatAndPagingParams],
    examples: examples.autocomplete || []
  },
  dagiReverseDoc(temaModel),
  ...  dagiReplikeringTilknytningDoc(temaModel)
];
