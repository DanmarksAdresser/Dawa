const {
  formatAndPagingParams,
  formatParameters,
  autocompleteSubtext,
  overwriteWithAutocompleteQParameter,
  strukturParameter,
  autocompleteParameter
} = require('./common');
const {
  getTemaModel,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  dagiReverseDoc,
  dagiReplikeringTilknytningDoc
} = require('./dagiCommon');

const model = getTemaModel('landsdel');

const examples = {
  query: [{
    description: 'Hent alle landsdele.',
    query: []
  }, ],
  get: [],
  autocomplete: []
};

const filterParams = [
  {
    name: 'q',
    doc: `Tekstsøgning. Der søges i navnet. Alle ord i søgeteksten skal matche. 
       Wildcard * er tilladt i slutningen af hvert ord. 
       Der returneres højst 1000 resultater ved anvendelse af parameteren.`
  },
  autocompleteParameter,
  {
    name: 'dagi_id',
    doc: 'Find landsdelen med det angivne DAGI ID'
  },
  {
    name: 'navn',
    doc: 'Find landsdelen med det angivne navn. Case-sensitiv. Parameteren skal matche navnet præcist'
  },
  {
    name: 'nuts3',
    doc: 'Find landsdelen med den angivne NUTS3 kode. For mere information om NUTS, se <a href="https://en.wikipedia.org/wiki/Nomenclature_of_Territorial_Units_for_Statistics">Wikipedia</a>.'
  }
];

const queryDoc = {
  entity: 'landsdel',
  path: `/landsdele`,
  subtext: `Søg efter landsdele. Returnerer de landsdele, der opfylder kriteriet.`,
  parameters: [
    ... filterParams,
    ...dagiReverseParameters(model),
    ...formatAndPagingParams,
    ...dagiSridCirkelPolygonParameters(model.plural),
    strukturParameter
  ],
  examples: examples.query
};

const getByKeyDoc = {
  entity: 'landsdel',
  path: `/landsdele/{nuts3}`,
  subtext: 'Modtag landsdel ud fra DAGI ID',
  parameters: [
    {
      name: 'nuts3',
      doc: 'Landsdelens unikke NUTS3 kode. For mere information om NUTS, se <a href="https://en.wikipedia.org/wiki/Nomenclature_of_Territorial_Units_for_Statistics">Wikipedia</a>.'
    },
    ...formatParameters, strukturParameter],
  nomulti: true,
  examples: examples.get
};

const autocompleteDoc = {
  entity: 'landsdel',
  path: `/landsdele/autocomplete`,
  subtext: autocompleteSubtext(model.plural),
  parameters: [...overwriteWithAutocompleteQParameter(filterParams), ...formatAndPagingParams],
  examples: examples.autocomplete
};

module.exports = [
  queryDoc,
  getByKeyDoc,
  autocompleteDoc,
  dagiReverseDoc(model),
  ...dagiReplikeringTilknytningDoc(model)
];
