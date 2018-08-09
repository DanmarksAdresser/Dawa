const {
  formatAndPagingParams,
  strukturParameter,
  SRIDParameter
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
    name: 'darstatus',
    doc: 'Find navngivne veje med den angivne status. Mulige værdier "gældende", "foreløbig".'
  },
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
    name: 'administrerendekommunekode',
    doc: 'Find de navngivne veje, som administreres af kommunen med den angivne kommunekode.'
  },
  {
    name: 'regex',
    doc: 'Find de navngivne veje, som matcher det angivne regulære udtryk.'
  },
  {
    name: 'fuzzy',
    doc: 'Aktiver fuzzy søgning'
  },
  {
    name: 'vejstykkeid',
    doc: 'Find den navngivne vej som vejstykket med den angivne id er en del af'
  }
];

const cirkelPolygonParameters = [  {
  name: 'polygon',
  doc: 'Find de navngivne veje, som overlapper med det angivne polygon. ' +
  'Polygonet specificeres som et array af koordinater på samme måde som' +
  ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
  ' Bemærk at polygoner skal' +
  ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
  ' Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Dette' +
  ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
  ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
  examples: []
},
  {
    name: 'cirkel',
    doc: 'Find de navngivne veje, som overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
    examples: []
  },
];

const reverseParams = [{
  name: 'x',
  doc: `Reverse geocoding. Find den navngivne vej som ligger nærmsest det angivne koordinat.
 Der benyttes det koordinatsystem, som er angivet i srid-parameteren (Default WGS84).`
}, {
  name: 'y',
  doc: `Reverse geocoding. Find den navngivne vej som ligger nærmsest det angivne koordinat.' +
  'Der benyttes det koordinatsystem, som er angivet i srid-parameteren (Default WGS84).`
}];

module.exports = [
  {
    entity: 'navngivenvej',
    path: '/navngivneveje',
    subtext: 'Søger efter navngivne veje. Returnerer de navngivne veje, som opfylder kriteriet.',
    parameters: [
      qParam,
      ...commonFilterParams,
      navngivenVejGeometriParameter,
      ...cirkelPolygonParameters,
      ...reverseParams,
      strukturParameter,
      SRIDParameter,
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
    subtext: 'Opslag på enkelt navngiven vej ud fra id.',
    parameters: [
      navngivenVejIdParameter,
      navngivenVejGeometriParameter,
      SRIDParameter,
      strukturParameter
    ],
    nomulti: true,
    examples: []
  },
  {
    entity: 'navngivenvej',
    path: '/navngivneveje/{id}/naboer',
    subtext: 'Find navngivne veje i nærheden af en navngven vej',
    parameters: [navngivenVejIdParameter,
      {
        name: 'afstand',
        doc: 'Angiver maksimal afstand i meter. Default er 0, som finder de navngivne veje, som støder helt op til den navngivne vej.'
      },
      ...formatAndPagingParams,
      strukturParameter,
      SRIDParameter],
    examples: [{
      description: 'Find alle navngivne veje, som støder op til den navngivne vej med id 65eb3979-821b-41fd-a8ef-da0de69edbc0',
      path: ['/navngivneveje/65eb3979-821b-41fd-a8ef-da0de69edbc0/naboer']
    }]
  },
];
