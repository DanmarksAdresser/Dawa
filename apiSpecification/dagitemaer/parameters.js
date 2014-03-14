"use strict";

var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var dagiTemaer = require('./dagiTemaer');
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

dagiTemaer.forEach(function(tema) {
  registry.addMultiple(tema.singular, 'parameterGroup', module.exports);
});