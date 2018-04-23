const {
  formatAndPagingParams,
  formatParameters,
  autocompleteSubtext,
  overwriteWithAutocompleteQParameter
} = require('./common');
const {
  dagiReverseDoc,
  getTemaModel,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  dagiReplikeringTilknytningDoc
} = require('./dagiCommon');

const model = getTemaModel('afstemningsområde');

const examples = {
  query: [{
    description: 'Hent alle afstemningsområder.',
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
    doc: 'Find afstemningsområdet med det angivne DAGI ID'
  },
  {
    name: 'nummer',
    doc: 'Find afstemningsområder med det angivne nummer. Nummeret er unikt indenfor en opstillingskreds.'
  },
  {
    name: 'navn',
    doc: 'Find afstemningsområdet med det angivne navn. Case-sensitiv.',
  },
  {
    name: 'opstillingskredsnummer',
    doc: 'Find afstemningsområderne i opstillingskredsen med det angivne nummer.'
  },
  {
    name: 'kommunekode',
    doc: 'Find afstemningsområderne i kommunen med den angivne kommunekode'
  },
  {
    name: 'regionskode',
    doc: 'Find afstemningsområderne i regionen med den angivne regionskode'
  }
];
const queryDoc = {
  entity: 'afstemningsområde',
  path: `/afstemningsomraader`,
  subtext: `Søg efter afstemningsområder. Returnerer de afstemningsområder der opfylder kriteriet.`,
  parameters: [
    ... filterParams,
    ...dagiReverseParameters(model),
    ...dagiSridCirkelPolygonParameters(model.plural),
    ...formatAndPagingParams,
  ],
  examples: examples.query
};

const getByKeyDoc = {
  entity: 'afstemningsområde',
  path: `/afstemningsomraader/{kommunekode}/{nummer}`,
  subtext: 'Modtag afstemningsområde ud fra kommunekode og nummer',
  parameters: [
    {
      name: 'kommunekode',
      doc: 'Afstemningsområdets kommunekode.'
    },
    {
      name: 'nummer',
      doc: 'Afstemningsområdets nummer indenfor kommunen.'
    },
    ...formatParameters],
  nomulti: true,
  examples: examples.get
};

const autocompleteDoc = {
  entity: 'afstemningsområde',
  path: `/afstemningsomraader/autocomplete`,
  subtext: autocompleteSubtext(model.plural),
  parameters: [
    ...overwriteWithAutocompleteQParameter(filterParams),
    ...formatAndPagingParams],
  examples: examples.autocomplete
};

module.exports = [
  queryDoc,
  getByKeyDoc,
  autocompleteDoc,
  dagiReverseDoc(model),
  ...dagiReplikeringTilknytningDoc(model)
];
