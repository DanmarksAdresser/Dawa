"use strict";

var dagiTemaer = require('./dagiTemaer');

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    plural: tema.plural,
    key: ['kode']
  };
});