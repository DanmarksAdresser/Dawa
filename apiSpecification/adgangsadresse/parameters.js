"use strict";

const _ = require('underscore');

const bebyggelseParameters = require('../flats/parameters').bebyggelse;
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
    name: 'status',
    type: 'integer'
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
    type: 'husnr',
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
    name: 'regionskode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'esrejendomsnr',
    type: 'integer',
    schema: {
      type: 'integer',
      maximum: 9999999
    },
    multi: true
  },
  {
    name: 'nøjagtighed',
    schema: {
      enum: ['A', 'B', 'U']
    },
    multi: true
  },
  {
    name: 'bebyggelsesid',
    type: 'string',
    schema: schema.uuid,
    multi: true
  },
  {
    name: 'bebyggelsestype',
    type: 'string',
    schema: _.findWhere(bebyggelseParameters.propertyFilter, {name: 'type' }).schema,
    multi: true
  },
  {
    name: 'ejerlavkode',
    type: 'integer',
    multi: false,
    renameTo: 'jordstykke_ejerlavkode'
  },
  {
    name: 'matrikelnr',
    type: 'string',
    multi: false,
    renameTo: 'jordstykke_matrikelnr'
  }

]);

exports.husnrinterval = normalizeParameters([
  {
    name: 'husnrfra',
    type: 'husnr'
  },
  {
    name: 'husnrtil',
    type: 'husnr'
  }
]);

exports.includeInvalid = [{
  name: 'medtagugyldige',
  type: 'boolean',
  default: false
}];

registry.addMultiple('adgangsadresse', 'parameterGroup', module.exports);
