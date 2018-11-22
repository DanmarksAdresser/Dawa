"use strict";

const representationUtil = require('../../common/representationUtil');
const fields = require('./fields');

module.exports = Object.keys(fields).reduce((memo, datamodelName) => {
  const flatRepresentation = representationUtil.defaultFlatRepresentation(fields[datamodelName]);
  memo[datamodelName] = {
    flat: flatRepresentation,
    json: {
      fields: flatRepresentation.fields,
      mapper: flatRepresentation.mapper
    }
  };
  return memo;
}, {});