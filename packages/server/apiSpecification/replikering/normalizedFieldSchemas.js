"use strict";

const assert = require('assert');

const _ = require('underscore');
const globalSchemaObject = require('../commonSchemaDefinitionsUtil').globalSchemaObject;

const replikeringModels = require('./datamodel');
const replikeringBindings = require('./dbBindings');
const temaModels = require('../../dagiImport/temaModels');

exports.normalizedField = function(datamodelName, fieldName) {
  const model = replikeringModels[datamodelName];
  assert(model);
  const field = _.findWhere(model.attributes, {name: fieldName});
  assert(field);
  const binding = replikeringBindings[datamodelName].attributes[fieldName];
  return Object.assign({}, field, {formatter: binding.formatter});
};

const temaReplikeringModels = temaModels.modelList.reduce((memo, temaModel) => {
  memo [temaModel.entity || temaModel.singular] = temaModels.toReplikeringModel(temaModel);
  return memo;
}, {});

const allReplikeringModels = Object.assign({}, replikeringModels, temaReplikeringModels)

exports.normalizedSchemaField = function(datamodelName, fieldName) {
  const model = allReplikeringModels[datamodelName];
  assert(model);
  const field = _.findWhere(model.attributes, {name: fieldName});
  assert(field, `${datamodelName} has field ${fieldName}`);
  const schema = Object.assign({}, field.schema);
  schema.description = field.description;
  return schema;
};

exports.schemas = Object.keys(allReplikeringModels).reduce((memo, modelName) => {
  const model = allReplikeringModels[modelName];
  const fieldNames = model.attributes.map(attr => attr.name);
  const properties = model.attributes.reduce((memo, attr) => {
    const property = JSON.parse(JSON.stringify(attr.schema));
    property.description = attr.description;
    property.deprecated = attr.deprecated;
    memo[attr.name] = property;
    return memo;
  }, {});
  memo[modelName] = globalSchemaObject({
    properties: properties,
    docOrder: fieldNames
  });
  return memo;
}, {});

