"use strict";

var dagiTemaer = require('./temaer');
var registry = require('../registry');

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    singular: tema.singular,
    plural: tema.plural,
    key: [tema.key]
  };
  registry.add(tema.singular, 'nameAndKey', undefined, exports[tema.singular]);
});