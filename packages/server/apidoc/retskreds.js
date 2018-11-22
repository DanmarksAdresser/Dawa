const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('retskreds');

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
  dagiQueryDoc(temaModel, examples.query),
  dagiByKodeDoc(temaModel, examples.get),
  dagiAutocompleteDoc(temaModel, examples.autocomplete),
  dagiReverseDoc(temaModel),
  ...dagiReplikeringTilknytningDoc(temaModel)
];
