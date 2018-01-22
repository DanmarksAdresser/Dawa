const {
  autocompleteSubtext,
  formatAndPagingParams,
  reverseGeocodingParameters,
  overwriteWithAutocompleteQParameter,
  SRIDParameter,
  strukturParameter
} = require('./common');

const {
  replikeringDoc
} = require('./replikeringCommon');

const vejstykkerIdParameters = [
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },
  {
    name: 'kode',
    doc: 'vejkode. 4 cifre.',
    examples: ['0052']
  }
];
const vejstykkerParameters = [{
  name: 'q',
  doc: 'Søgetekst. Der søges i vejnavnet. Alle ord i søgeteksten skal matche vejstykket. ' +
  'Wildcard * er tilladt i slutningen af hvert ord. ' +
  'Der skelnes ikke mellem store og små bogstaver.',
  examples: ['tværvej']
},
  {
    name: 'fuzzy',
    doc: 'Aktiver fuzzy søgning'
  },
  vejstykkerIdParameters[0],
  vejstykkerIdParameters[1],
  {
    name: 'navn',
    doc: "Vejnavn. Der skelnes mellem store og små bogstaver. Der kan anvendes wildcard-søgning.",
    examples: ['Margrethepladsen', 'Viborgvej']
  },
  {
    name: 'postnr',
    doc: 'Postnummer. 4 cifre.',
    examples: ['2700']
  },
  {
    name: 'polygon',
    doc: 'Find de vejstykker, som overlapper med det angivne polygon. ' +
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
    doc: 'Find de vejstykker, som overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
    examples: []
  },
  {
    name: 'regex',
    doc: 'Find de vejstykker, som matcher det angivne regulære udtryk.',
    examples: []
  }
];

const replikeringEventExamples = [
  {
    description: 'Find alle vejstykkehændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
    query: [{
      name: 'sekvensnummerfra',
      value: '990'
    }, {
      name: 'sekvensnummertil',
      value: '1000'
    }]
  },
  {
    description: 'Find alle hændelser for vejstykket med kommunekode 0840 og vejkode 1183',
    query: [{
      name: 'kommunekode',
      value: '0840'
    }, {
      name: 'kode',
      value: '1183'
    }]
  }
];

module.exports = [
  {
    entity: 'vejstykke',
    path: '/vejstykker',
    subtext: 'Søger efter vejstykker. Returnerer de vejstykker, som opfylder kriteriet.',
    parameters: vejstykkerParameters.concat(formatAndPagingParams).concat([strukturParameter]),
    examples: [{
      description: 'Find vejnavne som ligger i postnummeret<em>2400 København NV</em> og indeholder et ord der starter med <em>hvid</em>',
      query: [{name: 'postnr', value: '2400'}, {name: 'q', value: 'hvid*'}]
    },
      {
        description: 'Find alle vejnavne i Københavns kommune (kommunekode 0101)',
        query: [{name: 'kommunekode', value: '0101'}]
      }]
  },
  {
    entity: 'vejstykke',
    path: '/vejstykker/{kommunekode}/{kode}',
    subtext: 'Opslag på enkelt vejstykke ud fra kommunekode og vejkode.',
    parameters: vejstykkerIdParameters.concat([strukturParameter]),
    nomulti: true,
    examples: [{
      description: 'Hent information om vejstykket med kommunekode <em>0101</em>, og vejkoden <em>316</em>',
      path: ['/vejstykker/0101/316']
    }]
  },
  {
    entity: 'vejstykke',
    path: '/vejstykker/autocomplete',
    subtext: autocompleteSubtext('vejstykker'),
    parameters: overwriteWithAutocompleteQParameter(vejstykkerParameters).concat(formatAndPagingParams),
    examples: [{
      description: 'Find alle vejstykker som indeholder <em>jolle</em>',
      query: [{name: 'q', value: 'jolle'}]
    },
      {
        description: 'Find alle vejstykker som indeholder <em>strand </em> (bemærk mellemrum tilsidst).',
        query: [{name: 'q', value: 'strand '}]
      }]
  },
  {
    entity: 'vejstykke',
    path: '/vejstykker/reverse',
    subtext: 'Find det vejstykke, som ligger nærmest det angivne koordinat. Som koordinatsystem kan anvendes ' +
    'ETRS89/UTM32 med <em>srid=<a href="http://spatialreference.org/ref/epsg/25832/">25832</a></em> eller ' +
    'WGS84/geografisk med <em>srid=<a href="http://spatialreference.org/ref/epsg/4326/">4326</a></em>.  Default er WGS84.',
    parameters: reverseGeocodingParameters.concat([strukturParameter]),
    examples: [{
      description: 'Returner vejstykket nærmest punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
      query: [{name: 'x', value: '12.5851471984198'},
        {name: 'y', value: '55.6832383751223'}]
    },
      {
        description: 'Returner vejstykket nærmest punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
        query: [
          {name: 'x', value: '725369.59'},
          {name: 'y', value: '6176652.55'},
          {name: 'srid', value: '25832'}]
      }]
  },
  {
    entity: 'vejstykke',
    path: '/vejstykker/{kommunekode}/{kode}/naboer',
    subtext: 'Find vejstykker i nærheden af et vejstykke',
    parameters: vejstykkerIdParameters
      .concat([{
        name: 'afstand',
        doc: 'Angiver maksimal afstand i meter. Default er 0, som finder de vejstykker, som støder helt op til vejstykket.'
      }])
      .concat(formatAndPagingParams)
      .concat([strukturParameter, SRIDParameter]),
    examples: [{
      description: 'Find alle vejstykker, som støder op til vejstykket med kommunekode 101 og vejkode 64.',
      path: ['/vejstykker/101/64/naboer']
    }]
  },
  ...replikeringDoc('vejstykke', vejstykkerIdParameters, replikeringEventExamples)
];
