"use strict";

const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');
const getProvidedAttributes = require("../bindings/get-provided-attributes");
module.exports = Object.keys(datamodels).reduce((memo, datamodelName) => {
  const binding = dbBindings[datamodelName];
  memo[datamodelName] = binding.attributes.reduce((acc, attrBinding) => {
    for(let attrName of getProvidedAttributes(attrBinding)) {
      acc.push({name: attrName,
      selectable: true,
      multi: false
      });
    }
    return acc;
  }, []);
  return memo;
}, {});