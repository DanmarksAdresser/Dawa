const {
  formatAndPagingParams,
  strukturParameter
} = require('./common');

const navngivenVejIdParameter =
  {
    name: 'id',
    doc: 'Angiver id (UUID) for den navngivne vej',
    examples: ['11ebfac2-37d2-7205-e044-0003ba298018']
  };

const navngivenVejGeometriParameter = {
  name: 'geometri',
  doc: `Angiver hvilken geometri der returneres for GeoJSON format. Mulige værdier: "vejnavnelinje", "vejnavneområde". Default værdi
   er "vejnavnelinje"`
};

const qParam = {
  name: 'q',
  doc: `Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejstykket, kan dog anvendes i kombination med fuzzy
  parameteren. Wildcard * er tilladt i slutningen af hvert ord. 
  Der skelnes ikke mellem store og små bogstaver.`,
  examples: ['tværvej']
};

const autocompleteQParam = {
  name: 'q',
  doc: 'Se beskrivelse under <a href="generelt#autocomplete">autocomplete</a>',
  examples: ['Rådhu']
};

const commonFilterParams= [
  navngivenVejIdParameter,
  {
    name: 'navn',
    doc: 'Find de navngivne veje, som har det angivne navn. Navnet er case-sensitivt.'
  },
  {
    name: 'adresseringsnavn',
    doc: 'Find de navngivne veje, som har det angivne adresseringsnavn. Navnet er case-sensitivt.'
  },
  {
    name: 'kommunekode',
    doc: 'Find de navngivne veje, som ligger i kommunen med den angivne kommunekode.'
  },
  {
    name: 'regex',
    doc: 'Find de navngivne veje, som matcher det angivne regulære udtryk.'
  },
  {
    name: 'fuzzy',
    doc: 'Aktiver fuzzy søgning'
  },

];

module.exports = [
  {
    entity: 'navngivenvej',
    path: '/navngivneveje',
    subtext: 'Søger efter navngivne veje. Returnerer de navngivne veje, som opfylder kriteriet.',
    parameters: [
      qParam,
      ...commonFilterParams,
      navngivenVejGeometriParameter,
      strukturParameter,
      ...formatAndPagingParams],
    examples: []
  },
  {
    entity: 'navngivenvej',
    path: '/navngivneveje/autocomplete',
    subtext: 'Autocomplete på navngivne veje. Returnerer de navngivne veje, som opfylder kriteriet.',
    parameters: [
      autocompleteQParam,
      ...commonFilterParams,
      ...formatAndPagingParams],
    examples: []
  },
  {
    entity: 'navngivenvej',
    path: '/navngivneveje/{id}',
    subtext: 'Opslag på enkelt vejstykke ud fra id.',
    parameters: [
      navngivenVejIdParameter,
      navngivenVejGeometriParameter,
      strukturParameter
    ],
    nomulti: true,
    examples: []
  }
];
