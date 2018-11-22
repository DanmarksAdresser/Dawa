const {
  formatParameters,
  formatAndPagingParams,
  SRIDParameter,
  strukturParameter
} = require('./common');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');

const commonStedParameters = [
  {
    name: 'id',
    doc: 'Find stedet med det angivne, unikke ID'
  },
  {
    name: 'hovedtype',
    doc: 'Find steder med den angivne hovedtype, eksempelvis "bebyggelse"'
  },
  {
    name: 'undertype',
    doc: 'Find steder med den angivne undertype, eksempelvis "bydel"'
  },
  {
    name: 'primærtnavn',
    doc: `Find steder med det angivne primære navn. Case-senstiv. Vær opmærksom på,
    at steder kan have sekundære navne. For at søge efter alle navne for et sted anvendes
    ressourcen stednavne2.`
  },
  {
    name: 'kommunekode',
    doc: 'Find steder i kommunen med den angivne kommunekode'
  },
  {
    name: 'primærnavnestatus',
    doc: 'Søg efter steder hvor det primære navns status er den angivne parameter. Mulige værdier: "officielt", "uofficielt", "suAutoriseret"'
  },
  ...dagiSridCirkelPolygonParameters('sted'),
  strukturParameter,
  ...formatAndPagingParams,
];

module.exports = [
  {
    entity: 'sted',
    path: '/steder',
    subtext: 'Søg i steder.',
    parameters: [
      ...commonStedParameters,
      {
        name: 'x',
        doc: 'Find steder der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find steder der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
        'anvendes angives længde-værdien.'
      },
      {
        name: 'nærmeste',
        doc: 'Anvendes sammen med x- og y-parametrene. Angiver, at det sted som ligger nærmest det angivne punktet skal returneres i stedet for de' +
        ' steder som overlapper med punktet. Anvendes typisk sammen med hovedtype eller undertype parametrene.'
      }],
    examples: [
      {
        description: 'Find alle byer i Danmark',
        query: [{
          name: 'hovedtype',
          value: 'Bebyggelse'
        }, {
          name: 'undertype',
          value: 'by'
        }]
      },
      {
        description: 'Find alle golfbaner',
        query: [{
          name: 'hovedtype',
          value: 'Idraetsanlæg'
        }, {
          name: 'undertype',
          value: 'golfbane'
        }]
      }
    ]
  },
  {
    entity: 'sted',
    path: '/steder/{id}',
    subtext: 'Modtag sted med id.',
    parameters: [
      {
        name: 'id',
        doc: 'Stedets unikke ID.'
      },
      SRIDParameter,
      strukturParameter,
      ...formatParameters],
    nomulti: true,
    examples: []
  }
];


