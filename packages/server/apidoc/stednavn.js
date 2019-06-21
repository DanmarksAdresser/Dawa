const {
  autocompleteSubtext,
  formatParameters,
  formatAndPagingParams,
  fuzzyParameter,
  SRIDParameter,
  strukturParameter,
  autocompleteParameter
} = require('./common');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');

const {
  replikeringDoc
} = require('./replikeringCommon');

const commonStednavnParameters = [
  fuzzyParameter,
  {
    name: 'id',
    doc: 'Find stednavn med det angivne, unikke ID'
  },
  {
    name: 'hovedtype',
    doc: 'Find stednavne med den angivne hovedtype, eksempelvis "bebyggelse"'
  },
  {
    name: 'undertype',
    doc: 'Find stednavne med den angivne undertype, eksempelvis "bydel"'
  },
  {
    name: 'navn',
    doc: 'Find stednavne med det angivne navn. Case-senstiv.'
  },
  {
    name: 'kommunekode',
    doc: 'Find stednavne i kommunen med den angivne kommunekode'
  },
  {
    name: 'navnestatus',
    doc: 'Stednavnets navnestatus. Mulige værdier: "officielt", "uofficielt", "suAutoriseret"'
  },
  ...dagiSridCirkelPolygonParameters('stednavne'),
  strukturParameter,
  ...formatAndPagingParams,
];

const stednavnTilknytningParams = [
  {
    name: 'stednavn_id',
    doc: 'Stednavnets ID',
    examples: []
  },
  {
    name: 'adgangsadresse_id',
    doc: 'Adgangsadressens ID',
    examples: []
  }
];

module.exports = [
  {
    entity: 'stednavn',
    path: '/stednavne',
    subtext: 'Hent Stednavne.',
    parameters: [
      {
        name: 'q',
        doc: 'Find stednavne, hvor navnet matcher den angivne søgetekst'
      },
      autocompleteParameter,
      ...commonStednavnParameters,
      {
        name: 'x',
        doc: 'Find stednavne der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find stednavne der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
        'anvendes angives længde-værdien.'
      },
      {
        name: 'nærmeste',
        doc: 'Anvendes sammen med x- og y-parametrene. Angiver, at det stednavn som ligger nærmest det angivne punktet skal returneres i stedet for de' +
        ' stednavne som overlapper med punktet. Anvendes typisk sammen med hovedtype eller undertype parametrene.'
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
    entity: 'stednavn',
    path: '/stednavne/autocomplete',
    subtext: autocompleteSubtext('stednavne'),
    parameters: [
      {
        name: 'q',
        doc: 'Se beskrivelse under <a href="generelt#autocomplete">autocomplete</a>'
      },
      autocompleteParameter,
      ...commonStednavnParameters
    ],
    examples: []
  },
  {
    entity: 'stednavn',
    path: '/stednavne/{id}',
    subtext: 'Modtag stednavn med id.',
    parameters: [
      {
        name: 'id',
        doc: 'Stednavnets unikke ID'
      },
      SRIDParameter,
      strukturParameter,
      ...formatParameters],
    nomulti: true,
    examples: []
  },
  ...replikeringDoc('stednavntilknytning', stednavnTilknytningParams, [])
];


