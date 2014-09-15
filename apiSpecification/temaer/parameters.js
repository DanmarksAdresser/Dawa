"use strict";

var _ = require('underscore');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var dagiTemaer = require('./temaer');
var registry = require('../registry');

module.exports = {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'kode',
      type: 'integer',
      multi: true
    }
  ])
};

_.filter(dagiTemaer, function(tema) {
  return tema.published;
}).forEach(function(tema) {
  registry.addMultiple(tema.singular, 'parameterGroup', module.exports);
});