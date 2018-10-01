const {
  formatParameters,
  formatAndPagingParams,
  SRIDParameter,
  strukturParameter
} = require('./common');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');

const commonBygningParameters = [
  {
    name: 'id',
    doc: 'Find bygningspolygon med det angivne, unikke ID'
  },
  {
    name: 'bygningstype',
    doc: 'Find bygninger med den angivne bygningstype, eksempelvis "Bygning" eller "Tank/Silo"'
  },
  {
    name: 'metode3d',
    doc: 'Find bygninger med den angivne metode eksempelvis "Tag"'
  },
  {
    name: 'målested',
    doc: `Find bygninger med det angivne målested, eksempelvis "Tag".`
  },
  {
    name: 'bbrbygning_id',
    doc: 'Find bygningpolygon ud fra bygningens ID i BBR registeret. '
  },
  {
    name: 'kommunekode',
    doc: 'Find bygninger i den angivne kommune.'
  },
  ...dagiSridCirkelPolygonParameters('bygning'),
  strukturParameter,
  ...formatAndPagingParams,
];

module.exports = [
  {
    entity: 'bygning',
    path: '/bygninger',
    subtext: 'Søg i bygninger.',
    parameters: [
      ...commonBygningParameters,
      {
        name: 'x',
        doc: 'Find bygninger der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find bygninger der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
        'anvendes angives længde-værdien.'
      },
      {
        name: 'nærmeste',
        doc: 'Anvendes sammen med x- og y-parametrene. Angiver, at den bygning som ligger nærmest det angivne punkt skal returneres i stedet for den' +
        ' bygninger som overlapper med punktet.'
      }],
    examples: [
      {
        description: 'Hent alle bygninger af typen "Bygning" i Danmark',
        query: [{
          name: 'bygningstype',
          value: 'Bygning'
        }]
      }
    ]
  },
  {
    entity: 'bygning',
    path: '/bygninger/{id}',
    subtext: 'Modtag bygning med id.',
    parameters: [
      {
        name: 'id',
        doc: 'Bygningens unikke ID.'
      },
      SRIDParameter,
      strukturParameter,
      ...formatParameters],
    nomulti: true,
    examples: []
  }
];


