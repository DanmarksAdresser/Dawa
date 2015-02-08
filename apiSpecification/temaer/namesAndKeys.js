"use strict";

var _ = require('underscore');
var dagiTemaer = require('./temaer');
var registry = require('../registry');

dagiTemaer.forEach(function(tema) {
  exports[tema.singular] = {
    singular: tema.singular,
    plural: tema.plural,
    key: _.pluck(tema.key, 'name')
  };
  registry.add(tema.singular, 'nameAndKey', undefined, exports[tema.singular]);
});