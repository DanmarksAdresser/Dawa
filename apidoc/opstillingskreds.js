const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('opstillingskreds');

const examples = {
  query: [{
    description: 'Hent alle opstillingskredse.',
    query: []
  }, {
    description: 'Hent alle opstillingskredse der indeholder <em>esbjerg</em>',
    query: [{
      name: 'q',
      value: 'esbjerg'
    }]
  }],
  get: [{
    description: 'Hent data for opstillingskredsen Vesterbro (kode 9) i GeoJSON format',
    path: '/opstillingskredse/9',
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: [{
    description: 'Find opstillingskredse der starter med es',
    query: [{
      name: 'q',
      value: 'es'
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
