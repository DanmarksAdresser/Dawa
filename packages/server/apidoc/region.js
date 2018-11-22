const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('region');


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
  dagiQueryDoc(temaModel, examples.query),
  dagiByKodeDoc(temaModel, examples.get),
  dagiAutocompleteDoc(temaModel, examples.autocomplete),
  dagiReverseDoc(temaModel),
  ...dagiReplikeringTilknytningDoc(temaModel)
];
