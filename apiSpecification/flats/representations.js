"use strict";

const _ = require('underscore');

const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const flats = require('./flats');
const representationUtil = require('../common/representationUtil');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;


const jsonSchema = (fields) => {
  const schema = fields.reduce((memo, field) => {
    memo.properties[field.name] = {
      type: field.type,
      description: field.description
    };
    memo.docOrder.push(field.name);
    return memo;
  }, {properties: {}, docOrder: []});
  return globalSchemaObject(schema);
};

module.exports = _.mapObject(flats, (flat) => {
  const flatRepresentation = representationUtil.defaultFlatRepresentation(flat.fields);
  return {
    flat: flatRepresentation,
    json: {
      fields: _.pluck(flat.fields, 'name'),
      schema: jsonSchema(flat.fields),
      mapper: _.identity
    }
  }
});
