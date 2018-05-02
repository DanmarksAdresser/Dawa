const {
  formatAndPagingParams,
  formatParameters,
  autocompleteSubtext,
  overwriteWithAutocompleteQParameter,
  strukturParameter
} = require('./common');
const {
  dagiReverseDoc,
  getTemaModel,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  dagiReplikeringTilknytningDoc
} = require('./dagiCommon');

const model = getTemaModel('menighedsrådsafstemningsområde');

const examples = {
  query: [{
    description: 'Hent alle menighedsrådsafstemningsområder.',
    query: []
  }, ],
  get: [],
  autocomplete: []
};


const filterParams = [
  {
    name: 'q',
    doc: `Tekstsøgning. Der søges i nummer og navn. Alle ord i søgeteksten skal matche. 
       Wildcard * er tilladt i slutningen af hvert ord. 
       Der returneres højst 1000 resultater ved anvendelse af parameteren.`
  },
  {
    name: 'dagi_id',
    doc: 'Find menighedsrådsafstemningsområdet med det angivne DAGI ID'
  },
  {
    name: 'nummer',
    doc: 'Find menighedsrådsafstemningsområder med det angivne nummer.'
  },
  {
    name: 'navn',
    doc: 'Find afstemningsområdet med det angivne navn. Case-sensitiv.',
  },
  {
    name: 'kommunekode',
    doc: 'Find menighedsrådsafstemningsområderne i den angivne kommune.'
  },
  {
    name: 'sognekode',
    doc: 'Find menighedsrådsafstemningsområderne i sognet med den angivne sognekode'
  },
  ...formatAndPagingParams
];
const queryDoc = {
  entity: 'menighedsrådsafstemningsområde',
  path: `/menighedsraadsafstemningsomraader`,
  subtext: `Søg efter menighedsrådsafstemningsområder. Returnerer de menighedsrådsafstemningsområder der opfylder kriteriet.`,
  parameters: [
    ... filterParams,
    ...dagiReverseParameters(model),
    ...dagiSridCirkelPolygonParameters(model.plural),
    ...formatAndPagingParams,
    strukturParameter
  ],
  examples: examples.query
};

const getByKeyDoc = {
  entity: 'afstemningsområde',
  path: `/menighedsraadsafstemningsomraader/{kommunekode}/{nummer}`,
  subtext: 'Modtag menighedsrådsafstemningsområde ud fra kommunekode og nummer',
  parameters: [
    {
      name: 'kommunekode',
      doc: 'Menighedsrådsafstemningsområdets kommunekode.'
    },
    {
      name: 'nummer',
      doc: 'Menighedsrådsfstemningsområdets nummer indenfor kommunen.'
    },
    ...formatParameters, strukturParameter],
  nomulti: true,
  examples: examples.get
};

const autocompleteDoc = {
  entity: 'menighedsrådsafstemningsområde',
  path: `/menighedsraadsafstemningsomraader/autocomplete`,
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
