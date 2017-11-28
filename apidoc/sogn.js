const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('sogn');

const examples = {
  query: [{
    description: 'Find alle de sogne som starter med grøn',
    query: [{
      name: 'q',
      value: 'grøn*'
    }]
  }, {
    description: 'Returner alle sogne',
    query: {}
  }],
  get: [{
    description: 'Returner oplysninger om Grøndal sogn',
    path: ['/sogne/7060']
  }, {
    description: 'Returnerer oplysninger om Grøndal sogn i GeoJSON format',
    path: ['/sogne/7060'],
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: [{
    description: 'Find alle de sogne som starter med grøn',
    query: [{
      name: 'q',
      value: 'grøn'
    }]
  }]
};

module.exports = [
  dagiQueryDoc(temaDef, examples.query),
  dagiByKodeDoc(temaDef, examples.get),
  dagiAutocompleteDoc(temaDef, examples.autocomplete),
  dagiReverseDoc(temaDef),
  ...dagiReplikeringTilknytningDoc(temaDef)
];
