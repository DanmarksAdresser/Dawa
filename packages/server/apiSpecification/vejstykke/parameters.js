"use strict";

var schema = require('../parameterSchema');
var registry = require('../registry');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;


module.exports =  {
  id: normalizeParameters([
    {
      name: 'kode',
      type: 'integer',
      schema: schema.kode4
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    },
    {
      name: 'navngivenvej_id',
      type: 'string',
      schema: schema.uuid
    },
  {
    name: 'kode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'kommunekode',
    type: 'integer',
    schema: schema.kode4,
    multi: true
  },
  {
    name: 'navn',
    multi: true
  },
  {
    name: 'postnr',
    type: 'integer',
    schema: schema.postnr,
    multi: true
  }
]),
  regex: normalizeParameters([{
    name: 'regex',
    type: 'string',
    schema: {
      maxLength: 100,
      minLength: 1
    },
    validateFun: (param) => {
      try {
        new RegExp(param);
      }
      catch(e) {
        throw e.message;
      }
    }
  }]),
  distance: normalizeParameters([{
    name: 'afstand',
    type: 'float',
    defaultValue: 0,
    schema: {
      type: 'number',
      minimum: 0
    }
  }])
};
registry.addMultiple('vejstykke', 'parameterGroup', module.exports);
