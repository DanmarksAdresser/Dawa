const {
  dagiAutocompleteDoc,
  dagiByKodeDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('politikreds');

const examples = {
  query: [{
    description: 'Hent alle politikredse',
    query: []
  }],
  get: [{
    description: 'Hent <em>Syd- og Sønderjyllands Politi</em> (kode 1464) i GeoJSON format.',
    path: '/politikredse/1464',
    query: [{
      name: 'format',
      value: 'geojson'
    }]
  }],
  autocomplete: [{
    name: 'Find alle politikredse, der indeholder et ord der starter med sønd',
    query: [{
      name: 'q',
      value: 'sønd'
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
