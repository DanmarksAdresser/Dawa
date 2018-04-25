const {
  formatAndPagingParams,
  overwriteWithAutocompleteQParameter,
  reverseGeocodingParameters,
  strukturParameter,
  autocompleteSubtext
} = require('./common');
const {dagiSridCirkelPolygonParameters} = require('./dagiCommon');

const {
  replikeringDoc
} = require('./replikeringCommon');

const {
  dagiReplikeringTilknytningDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('postnummer');

const nrParameter = {
  name: 'nr',
  doc: 'Postnummer. 4 cifre.',
  examples: ['2690', '8600']
};

const landpostnumreParam = {
  name: 'landpostnumre',
  doc: 'Hvis denne parameter er sat vil den returnerede geometri for postnumre være afgrænset af kyster.'
};

const postnummerParameters = [nrParameter,
  {
    name: 'navn',
    doc: 'Postnummernavn',
    examples: ['Aarhus', 'København']
  },
  {
    name: 'kommunekode',
    doc: 'Kommunekode. 4 cifre. Eksempel: 0101 for Københavns kommune.',
    examples: ['0101']
  },
  {
    name: 'q',
    doc: 'Søgetekst. Der søges i postnummernavnet. Alle ord i søgeteksten skal matche postnummernavnet. ' +
    'Wildcard * er tilladt i slutningen af hvert ord. Der returneres højst 1000 resultater ved anvendelse af parameteren.'
  },
  {
    name: 'stormodtagere',
    doc: "Hvis denne parameter er sat til 'true', vil stormodtager-postnumre medtages i resultatet. Default er false."
  }];

const postnummerEventExamples = [{
  description: 'Find alle postnummerhændelser med sekvensnummer større eller lig 990 og sekvensnummer mindre eller lig 1000',
  query: [{
    name: 'sekvensnummerfra',
    value: '990'
  }, {
    name: 'sekvensnummertil',
    value: '1000'
  }]
}, {
  description: 'Find alle hændelser for postnummeret 8000',
  query: [{
    name: 'nr',
    value: '8000'
  }]
}];

module.exports = [
  {
    entity: 'postnummer',
    path: '/postnumre',
    subtext: 'Søg efter postnumre. Returnerer de postnumre som opfylder kriteriet.',
    parameters:
      [...postnummerParameters,
        landpostnumreParam,
        ...dagiSridCirkelPolygonParameters('postnumre'),
        ...formatAndPagingParams,
        strukturParameter],
    examples:
      [{description: 'Hent alle postnumre', query: []},
        {
          description: 'Find postnummer <em>8600</em>',
          query: [{name: 'nr', value: "8600"}]
        },
        {
          description: 'Find alle postnumre som benyttes i kommune <em>751</em> Aarhus',
          query: [{name: 'kommunekode', value: "751"}]
        },
        {
          description: 'Find postnummer for postnummernavn <em>Silkeborg</em>',
          query: [{name: 'navn', value: "Silkeborg"}]
        },
        {
          description: 'Find alle postnumre som indeholder ordet <em>strand</em>',
          query: [{name: 'q', value: "strand"}]
        },
        {
          description: 'Find alle postnumre som indeholder <em>aar*</em>',
          query: [{name: 'q', value: "aar*"}]
        }]
  },
  {
    path: '/postnumre/{nr}',
    entity: 'postnummer',
    subtext: 'Modtag postnummer med id.',
    parameters:
      [nrParameter].concat([landpostnumreParam, strukturParameter]),
    nomulti:
      true,
    examples:
      [{
        description: 'Hent postnummer for København NV',
        path: ['/postnumre/2400']
      }]
  },
  {
    path: '/postnumre/autocomplete',
    entity: 'postnummer',
    subtext: autocompleteSubtext('postnumre'),
    parameters:
      overwriteWithAutocompleteQParameter(postnummerParameters).concat(formatAndPagingParams),
    examples:
      [{
        description: 'Find alle postnumre som indeholder <em>strand</em> i postnummerbetegnelsen',
        query: [{name: 'q', value: 'strand'}]
      }]
  },
  {
    path: '/postnumre/reverse',
    entity: 'postnummer',
    subtext: 'Modtage postnummeret for det punkt der angives med x- og y-parametrene',
    parameters:
      reverseGeocodingParameters.concat([landpostnumreParam, strukturParameter]),
    nomulti:
      true,
    examples:
      [
        {
          description: 'Returner postnummeret for punktet angivet af WGS84/geografisk koordinatet (12.5851471984198, 55.6832383751223)',
          query: [
            {name: 'x', value: '12.5851471984198'},
            {name: 'y', value: '55.6832383751223'}
          ]
        },
        {
          description: 'Returner postnummeret for punktet angivet af ETRS89/UTM32 koordinatet (725369.59, 6176652.55)',
          query: [
            {name: 'x', value: '725369.59'},
            {name: 'y', value: '6176652.55'},
            {name: 'srid', value: '25832'}]
        }
      ]
  },
  ...replikeringDoc('postnummer', [nrParameter], postnummerEventExamples),
  ...dagiReplikeringTilknytningDoc(temaModel)
];
