"use strict";

var schema = require('../parameterSchema');
var registry = require('../registry');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;

exports.id = normalizeParameters([
  {
    name: 'id',
    type: 'string',
    schema: schema.uuid
  }
]);

exports.propertyFilter = normalizeParameters([
  {
    name: 'id',
    type: 'string',
    schema: schema.uuid,
    multi: true
  },
  {
    name: 'vejkode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'vejnavn',
    multi: true
  },
  {
    name: 'husnr',
    multi: true
  },
  {
    name: 'supplerendebynavn',
    multi: true
  },
  {
    name: 'postnr',
    type: 'integer',
    schema: schema.postnr,
    multi: true
  },
  {
    name: 'kommunekode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'ejerlavkode',
    type: 'integer',
    multi: true
  },
  {
    name: 'matrikelnr',
    multi: true
  },
  {
    name: 'esrejendomsnr',
    type: 'integer',
    multi: true
  }
]);

registry.addMultiple('adgangsadresse', 'parameterGroup', module.exports);