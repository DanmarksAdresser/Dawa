"use strict";

var schema = require('../parameterSchema');
var registry = require('../registry');
var normalizeParameters = require('../common/parametersUtil').normalizeParameters;


module.exports = {
  id: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    }
  ]),
  propertyFilter: normalizeParameters([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid,
      multi: true
    },
    {
      name: 'navn',
      type: 'string',
      multi: true
    },
    {
      name: 'adresseringsnavn',
      type: 'string',
      multi: true
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4,
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
      catch (e) {
        throw e.message;
      }
    }
  }])
};
registry.addMultiple('navngivenvej', 'parameterGroup', module.exports);
