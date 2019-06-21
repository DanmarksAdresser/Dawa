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

const commonStednavnParameters = [
  fuzzyParameter,
  {
    name: 'sted_id',
    doc: 'Find stednavne for stedet med det angivne ID. '
  },
  {
    name: 'hovedtype',
    doc: 'Find stednavne hvor stedet har den angivne hovedtype, eksempelvis "bebyggelse"'
  },
  {
    name: 'undertype',
    doc: 'Find stednavne hvor stedet har den angivne undertype, eksempelvis "bydel"'
  },
  {
    name: 'navn',
    doc: 'Find stednavne med det angivne navn. Case-senstiv.'
  },
  {
    name: 'kommunekode',
    doc: 'Find stednavne hvor stedet ligger i kommunen med den angivne kommunekode'
  },
  {
    name: 'navnestatus',
    doc: 'Find stednavne med den angivne navnestatus. Mulige værdier: "officielt", "uofficielt", "suAutoriseret"'
  },
  {
    name: 'brugsprioritet',
    doc: 'Find stednavne med den angivne brugsprioritet. Mulige værdier: "primær", "sekundær".'
  },
  ...dagiSridCirkelPolygonParameters('stednavne'),
  strukturParameter,
  ...formatAndPagingParams,
];

module.exports = [
  {
    entity: 'stednavn2',
    path: '/stednavne2',
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
        doc: 'Find stednavne hvor stedet overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find stednavne hvor stedet overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
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
    entity: 'stednavn2',
    path: '/stednavne2/autocomplete',
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
    entity: 'stednavn2',
    path: '/stednavne2/{sted_id}/{navn}',
    subtext: 'Modtag stednavn med stedid og navn.',
    parameters: [
      {
        name: 'sted_id',
        doc: 'Unikt ID for det sted som stednavnet navngiver.'
      },
      {
        name: 'navn',
        doc: 'Stednavnets navn.'
      },
      SRIDParameter,
      strukturParameter,
      ...formatParameters],
    nomulti: true,
    examples: []
  }
];


