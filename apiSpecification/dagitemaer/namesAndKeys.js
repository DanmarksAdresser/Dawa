"use strict";

var dagiTemaer = require('./dagiTemaer');
var registry = require('../registry');

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    singular: tema.singular,
    plural: tema.plural,
    key: ['kode']
  };
  registry.add(tema.singular, 'nameAndKey', undefined, exports[tema.singular]);
});