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
    name: 'politikredskode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'opstillingskredskode',
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
    name: 'stedid',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'stednavnid',
    type: 'string',
    schema: schema.uuid,
    renameTo: 'stedid'
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
  },
  {
    name: 'regionskode',
    type: 'integer',
    multi: true,
    schema: schema.kode4
  },
  {
    name: 'afstemningsområdenummer',
    type: 'integer',
    multi: true
  },
  {
    name: 'opstillingskredskode',
    type: 'integer',
    multi: true,
    schema: schema.kode4
  },
  {
    name: 'storkredsnummer',
    type: 'integer',
    multi: true
  },
  {
    name: 'valglandsdelsbogstav',
    type: 'string',
    multi: true
  },
  {
    name: 'politikredskode',
    type: 'integer',
    multi: true,
    schema: schema.kode4
  },
  {
    name: 'sognekode',
    type: 'integer',
    multi: true,
    schema: schema.kode4
  },
  {
    name: 'retskredskode',
    type: 'integer',
    multi: true,
    schema: schema.kode4
  },
  {
    name: 'zone',
    type: 'zone',
    multi: true
  },
  {
    name: 'zonekode',
    type: 'integer',
    multi: true,
    renameTo: 'zone'
  },
  {
    name: 'adgangspunktid',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'vejpunkt_id',
    type: 'string',
    schema: schema.uuid
  },
  {
    name: 'navngivenvej_id',
    type: 'string',
    schema: schema.uuid
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
  type: 'boolean'
}];

exports.includeDeleted = [{
  name: 'medtagnedlagte',
  type: 'boolean'
}];

exports.geometri = [
  {
    name: 'geometri',
    type: 'string',
    defaultValue: 'adgangspunkt',
    schema: {
      enum: ['adgangspunkt', 'vejpunkt']
    }
  }];

exports.stednavnafstand = [
  {
    name: 'stednavnafstand',
    type: 'float',
    schema: {
      type: 'number',
      minimum: 0
    },
    renameTo: 'stedafstand'
  },
  {
    name: 'stedafstand',
    type: 'float',
    schema: {
      type: 'number',
      minimum: 0
    }
  },

]

registry.addMultiple('adgangsadresse', 'parameterGroup', module.exports);
