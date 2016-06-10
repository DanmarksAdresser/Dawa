"use strict";

const _ = require('underscore');

const commonMappers = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const flats = require('./flats');
const fieldsMap = require('./fields');
const registry = require('../registry');
const representationUtil = require('../common/representationUtil');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;


const makeHref = commonMappers.makeHref;

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
  const fields = fieldsMap[flat.singular];
  const flatFields = fields.filter(field => field.name !== 'geom_json');
  const flatRepresentation = representationUtil.defaultFlatRepresentation(flatFields);
  const schema = jsonSchema(flat.fields);
  schema.properties.href = {
    type: 'string'
  };
  const representations = {
    flat: flatRepresentation,
    json: {
      fields: flatFields,
      schema: schema,
      mapper: (baseUrl, params) => (row => {
        row.href = makeHref(baseUrl, 'bebyggelse', [row.id]);
        return row;
      })
    }
  }
  const geojsonField = _.findWhere(fields, {name: 'geom_json'});
  representations.geojson = representationUtil.geojsonRepresentation(geojsonField, representations.flat);
  representations.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, representations.json);
  return representations;
});

Object.keys(module.exports).forEach(flatName => {
  registry.addMultiple(flatName, 'representation', module.exports[flatName]);
});
