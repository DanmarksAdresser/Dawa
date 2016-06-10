"use strict";

const flats = require('./flats');
const registry = require('../registry');
const _ = require('underscore');

module.exports = _.mapObject(flats, (flat) => {
  const key = flat.key;
  const idParameters = key.map((keyFieldName) => {
    const field = _.findWhere(flat.fields, { name: keyFieldName });
    return {
      name: field.name,
      type: field.type,
      schema: field.schema
    };
  }, {});
  const propertyFilterParameters = key.concat(flat.filters).map(keyFieldName => {
    const field = _.findWhere(flat.fields, { name: keyFieldName });
    return {
      name: field.name,
      type: field.type,
      schema: field.schema,
      multi: true
    };
  }, {});

  return {
    id: idParameters,
    propertyFilter: propertyFilterParameters
  };
});

_.each(module.exports, function(parameterGroup, flatName) {
  registry.addMultiple(flatName, 'parameterGroup', parameterGroup);
});
