"use strict";

const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');

module.exports = Object.keys(datamodels).reduce((memo, datamodelName) => {
  const datamodel = datamodels[datamodelName];
  const binding = dbBindings[datamodelName];
  memo[datamodelName] = datamodel.attributes.map(attr => {
    const attrBinding = binding.attributes[attr.name];
    return {
      name: attr.name,
      selectable: true,
      multi: false,
      formatter: attrBinding.formatter
    };
  });
  return memo;
}, {});