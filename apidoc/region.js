const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('region');


const examples = {
  query: [{
    description: 'Find alle regioner.',
    query: []
  }],
  get: [{
    description: 'Modtag Region Midtjylland (kode 1082)',
    path: ['/regioner/1082']
  }, {
    description: 'Hent Region Midtjylland i GeoJSON format med ETRS89 Zone 32N som koordinatsystem',
    path: ['/regioner/1082?format=geojson&srid=25832']
  }],
  autocomplete: [{
    description: 'Find regioner der starter med <em>midt</em>',
    query: [{
      name: 'q',
      value: 'midt'
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
