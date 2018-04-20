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

const model = getTemaModel('opstillingskreds');

const examples = {
  query: [{
    description: 'Hent alle opstillingskredse.',
    query: []
  }, {
    description: 'Hent alle opstillingskredse der indeholder <em>esbjerg</em>',
    query: [{
      name: 'q',
      value: 'esbjerg'
    }]
  }],
  get: [{
    description: 'Hent data for opstillingskredsen Vesterbro (kode 9) i GeoJSON format',
    path: '/opstillingskredse/9',
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: [{
    description: 'Find opstillingskredse der starter med es',
    query: [{
      name: 'q',
      value: 'es'
    }]
  }]
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
    doc: 'Find opstillingskredsen med det angivne DAGI ID.'
  },
  {
    name: 'nummer',
    doc: 'Find opstillingskredse med det angivne nummer. Nummeret er unikt indenfor en opstillingskreds.'
  },
  {
    name: 'navn',
    doc: 'Find opstillingskredsen med det angivne navn. Case-sensitiv.',
  },
  {
    name: 'kredskommunekode',
    doc: 'Find opstillingskredsene med den angivnekredskommune.'
  },
  {
    name: 'regionskode',
    doc: 'Find opstillingskredsene i regionen med den angivne regionskode.'
  },
  {
    name: 'storkredsnummer',
    doc: 'Find opstillingskredsene i den angivne storkreds.'
  },
  {
    name: 'valglandsdelsbogstav',
    doc: 'Find opstillingskredsene i den angivne valglandsdel.'
  },
  {
    name: 'kommunekode',
    doc: 'Find opstillingskredse, hvor mindst et af afstemningsområderne i opstillingskredsen ligger i den angivne kommune.'
  },
  {
    name: 'kode',
    doc: 'Deprecated. Anvend parameteren nummer i stedet.'
  }
];
const queryDoc = {
  entity: 'opstillingskreds',
  path: `/opstillingskredse`,
  subtext: `Søg efter opstillingskredse. Returnerer de opstillingskredse der opfylder kriteriet.`,
  parameters: [
    ... filterParams,
    ...dagiReverseParameters(model),
    ...dagiSridCirkelPolygonParameters(model.plural),
    ...formatAndPagingParams,
  ],
  examples: examples.query
};

const getByKeyDoc = {
  entity: 'opstillingskreds',
  path: `/opstillingskredse/{kode}`,
  subtext: 'Modtag opstillingskreds ud fra kommunekode og nummer',
  parameters: [
    {
      name: 'kode',
      doc: 'Opstillingskredsens nummer.'
    },
    ...formatParameters],
  nomulti: true,
  examples: examples.get
};

const autocompleteDoc = {
  entity: 'opstillingskreds',
  path: `/opstillingskredse/autocomplete`,
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
