"use strict";

const representationUtil = require('../../common/representationUtil');
const fields = require('./fields');
const dbBindings = require('../dbBindings');
const { createRowFormatter} = require('../bindings/util');
module.exports = Object.keys(fields).reduce((memo, datamodelName) => {
  const entityBinding = dbBindings[datamodelName];
  const flatRepresentation = representationUtil.defaultFlatRepresentation(fields[datamodelName]);
  memo[datamodelName] = {
    flat: flatRepresentation,
    json: {
      fields: flatRepresentation.fields,
      mapper: baseUrl => createRowFormatter(entityBinding)
    }
  };
  return memo;
}, {});