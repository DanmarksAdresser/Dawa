const {
  dagiAutocompleteDoc,
  dagiQueryDoc,
  dagiReplikeringTilknytningDoc,
  dagiReverseDoc,
  getTemaModel
} = require('./dagiCommon');

const model = getTemaModel('menighedsrådsafstemningsområde');

const examples = {
  query: [{
    description: 'Hent alle menighedsrådsafstemningsområder.',
    query: []
  }, ],
  get: [],
  autocomplete: []
};

module.exports = [
  dagiQueryDoc(model, examples.query),
  dagiAutocompleteDoc(model, examples.autocomplete),
  dagiReverseDoc(model),
  ...dagiReplikeringTilknytningDoc(model)
];
