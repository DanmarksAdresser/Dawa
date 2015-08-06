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
])
};
registry.addMultiple('vejstykke', 'parameterGroup', module.exports);