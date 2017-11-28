const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('retskreds');

const examples = {
  query: [{
    description: 'Hent alle retskredse',
    query: []
  }, {
    description: 'Find de retskredse, som indeholder <em>århus</em>',
    query: [{
      name: 'q',
      value: 'århus'
    }]
  }],
  get: [{
    description: 'Modtag <em>Retten i Århus</em> (kode 1165) i GeoJSON format',
    path: '/retskredse/1165',
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: {
    description: 'Find retskredse der starter med <em>aa</em>',
    query: [{
      name: 'q',
      value: 'aa'
    }]
  }
};

module.exports = [
  dagiQueryDoc(temaDef, examples.query),
  dagiByKodeDoc(temaDef, examples.get),
  dagiAutocompleteDoc(temaDef, examples.autocomplete),
  dagiReverseDoc(temaDef),
  ...dagiReplikeringTilknytningDoc(temaDef)
];
