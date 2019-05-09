const {
  formatAndPagingParams,
  formatParameters,
  autocompleteSubtext,
  overwriteWithAutocompleteQParameter,
  strukturParameter
} = require('./common');
const {
  getTemaModel,
  dagiReverseParameters,
  dagiSridCirkelPolygonParameters,
  dagiReverseDoc,
  dagiReplikeringTilknytningDoc
} = require('./dagiCommon');

const model = getTemaModel('supplerendebynavn');

const examples = {
  query: [{
    description: 'Hent alle supplerende bynavne.',
    query: []
  }, ],
  get: [],
  autocomplete: []
};

const medtagnedlagteParam = {
  name: 'medtagnedlagte',
  doc: 'Medtag nedlagte supplerende bynavne. Bemærk, at nedlagte supplerende bynavne ikke har en geometri eller kommune tilknyttet.'
};

const filterParams = [
  {
    name: 'q',
    doc: `Tekstsøgning. Der søges i navnet. Alle ord i søgeteksten skal matche. 
       Wildcard * er tilladt i slutningen af hvert ord. 
       Der returneres højst 1000 resultater ved anvendelse af parameteren.`
  },
  {
    name: 'dagi_id',
    doc: 'Find det supplerende bynavn med det angivne DAGI ID'
  },
  {
    name: 'navn',
    doc: 'Find det supplerende bynavn med det angivne navn. Case-sensitiv.',
  },
  {
    name: 'kommunekode',
    doc: 'Find de supplerende bynavne i den angivne kommune.'
  }
];

const queryDoc = {
  entity: 'supplerendebynavn',
  path: `/supplerendebynavne2`,
  subtext: `Søg efter supplerende bynavne. Returnerer de supplerende bynavne, der opfylder kriteriet.`,
  parameters: [
    ... filterParams,
    ...dagiReverseParameters(model),
    ...formatAndPagingParams,
    ...dagiSridCirkelPolygonParameters(model.plural),
    medtagnedlagteParam,
    strukturParameter
  ],
  examples: examples.query
};

const getByKeyDoc = {
  entity: 'supplerendebynavn',
  path: `/supplerendebynavne2/{dagi_id}`,
  subtext: 'Modtag supplerende bynavn ud fra DAGI ID',
  parameters: [
    {
      name: 'dagi_id',
      doc: 'Det supplerende bynavns unikke DAGI ID.'
    },
    medtagnedlagteParam,
    ...formatParameters, strukturParameter],
  nomulti: true,
  examples: examples.get
};

const autocompleteDoc = {
  entity: 'supplerendebynavn',
  path: `/supplerendebynavne2/autocomplete`,
  subtext: autocompleteSubtext(model.plural),
  parameters: [...overwriteWithAutocompleteQParameter(filterParams), medtagnedlagteParam, ...formatAndPagingParams],
  examples: examples.autocomplete
};

module.exports = [
  queryDoc,
  getByKeyDoc,
  autocompleteDoc,
  dagiReverseDoc(model),
  ...dagiReplikeringTilknytningDoc(model)
];
