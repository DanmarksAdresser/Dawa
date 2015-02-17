"use strict";

var _ = require('underscore');

var dagiTemaer = require('./temaer');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;
var registry = require('../registry');
var schema = require('../parameterSchema');

var kodeAndNavn = {
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

var kodeAndNavnTemaer = ['region', 'kommune', 'sogn', 'opstillingskreds', 'retskreds', 'politikreds'];
kodeAndNavnTemaer.forEach(function(dagiTemaNavn) {
  module.exports[dagiTemaNavn] = kodeAndNavn;
});

module.exports.valglandsdel = {
  id: normalizeParameters([
    {
      name: 'bogstav'
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'navn',
      multi: true
    },
    {
      name: 'bogstav',
      multi: true
    }
  ])
};

module.exports.jordstykke = {
  id: normalizeParameters([
    {
      name: 'ejerlavkode'
    },
    {
      name: 'matrikelnr'
    }
  ]),
  propertyFilter: [
    {
      name: 'ejerlavkode',
      multi: true
    },
    {
      name: 'matrikelnr',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'regionskode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'sognekode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'retskredskode',
      type: 'integer',
      schema: schema.kode4,
      multi: true
    },
    {
      name: 'esrejendomsnr',
      type: 'integer',
      multi: true
    },
    {
      name: 'sfeejendomsnr',
      type: 'integer',
      multi: true
    }
  ]
};

_.each(module.exports, function(parameterGroup, temaName) {
  registry.addMultiple(temaName, 'parameterGroup', parameterGroup);
});