const {
  formatParameters,
  formatAndPagingParams,
  SRIDParameter
} = require('./common');

const {
  dagiSridCirkelPolygonParameters
} = require('./dagiCommon');

module.exports = [
  {
    entity: 'bebyggelse',
    path: '/bebyggelser',
    subtext: `DEPRECATED: Anvend stednavne-API'et i stedet. Søg efter bebyggelser. `,
    parameters: [{
      name: 'id',
      doc: 'Find bebyggelse med det angivne ID'
    }, {
      name: 'navn',
      doc: 'Find bebyggelse med det angivne navn. Case-sensitiv.'
    }, {
      name: 'type',
      doc: 'Find bebyggelser af den angivne type'
    }, SRIDParameter,
      {
        name: 'x',
        doc: 'Find bebyggelser der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives øst-værdien.) Hvis WGS84/geografisk anvendes angives bredde-værdien.'
      },
      {
        name: 'y',
        doc: 'Find bebyggelser der overlapper med det angivne punkt. Både x- og y-parameter skal angives. (Hvis ETRS89/UTM32 anvendes angives nord-værdien.) Hvis WGS84/geografisk ' +
        'anvendes angives længde-værdien.'
      }, ...dagiSridCirkelPolygonParameters('bebyggelser'), ...formatAndPagingParams],
    examples: [
      {
        description: 'Find alle bebyggelser',
        query: []
      },
      {
        description: 'Find alle bebyggelser af typen "kolonihave".',
        query: [{
          name: 'type',
          value: 'kolonihave'
        }]
      },
      {
        description: 'Modtag bebyggelser i GeoJSON format',
        query: [{
          name: 'format',
          value: 'geojson'
        }]
      }
    ]
  },
  {
    entity: 'bebyggelse',
    path: '/bebyggelser/{id}',
    subtext: 'Modtag enkelt bebyggelse',
    parameters: [{name: 'id', doc: 'Bebyggelsens ID'}, ...formatParameters],
    examples: [{
      description: 'Modtag bebyggelse med ID "12337669-a084-6b98-e053-d480220a5a3f" (Båring Ege)',
      path: ['/bebyggelser/12337669-a084-6b98-e053-d480220a5a3f']
    }, {
      description: 'Hent bebyggelsen med ID "12337669-c79d-6b98-e053-d480220a5a3f" (Stavtrup) i GeoJSON format med ETRS89 Zone 32N som koordinatsystem',
      path: ['/bebyggelser/12337669-c79d-6b98-e053-d480220a5a3f?format=geojson&srid=25832']
    }]
  }
];
