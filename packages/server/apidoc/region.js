const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('region');

const additionalFilterParameters = [
  {
    name: 'nuts2',
    doc: 'Find region med den angivne NUTS2 kode. For mere information om NUTS, se <a href="https://en.wikipedia.org/wiki/Nomenclature_of_Territorial_Units_for_Statistics">Wikipedia</a>.'
  }
]


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
  dagiQueryDoc(temaModel, examples.query, additionalFilterParameters),
  dagiByKodeDoc(temaModel, examples.get),
  dagiAutocompleteDoc(temaModel, examples.autocomplete, additionalFilterParameters),
  dagiReverseDoc(temaModel),
  ...dagiReplikeringTilknytningDoc(temaModel)
];
