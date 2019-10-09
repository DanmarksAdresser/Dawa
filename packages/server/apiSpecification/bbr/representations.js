"use strict";

const _ = require('underscore');
const {createRowFormatter, getAllProvidedAttributes, getAttributeBinding} = require('../replikering/bindings/util');
const grbbrModels = require('../../ois2/parse-ea-model');
const {getReplicationBinding} = require('../../ois2/replication-models');
const {getRelationsForEntity} = require('../../ois2/relations');
const {makeRefObj, geojsonFields, getEntityName, makeBbrHref} = require('./common');
const {addGeojsonRepresentationsUsingBinding} = require('../common/representationUtil');
const {getDefaultSchema} = require('../replikering/datamodelUtil');
const {globalSchemaObject}  = require('../commonSchemaDefinitionsUtil');

const registry = require('../registry');
const createFlatFormatter = (grbbrModel) => {
  const binding = getReplicationBinding(grbbrModel.name, 'current');
  const basicRowFormatter = createRowFormatter(binding);
  const relations = getRelationsForEntity(grbbrModel.name);
  return baseUrl => row => {
    const formattedRow = basicRowFormatter(row);
    for (let relation of relations) {
      const id = formattedRow[relation.attribute];
      delete formattedRow[relation.attribute];
      if (id) {
        let refObj = makeRefObj(baseUrl, relation.references, id);
        for (let [key, val] of Object.entries(refObj)) {
          formattedRow[`${relation.attribute}_${key}`] = val;
        }
      }
    }
    return formattedRow;
  };
};

const makeFlatRepresentation = (grbbrModel) => {
  const binding = getReplicationBinding(grbbrModel.name, 'current');
  return {
    fields: [],
    outputFields: getAllProvidedAttributes(binding.attributes),
    mapper: createFlatFormatter(grbbrModel)
  };
};
const createJsonFormatter = (grbbrModel) => {
  const binding = getReplicationBinding(grbbrModel.name, 'current');
  const basicRowFormatter = createRowFormatter(binding);
  const relations = getRelationsForEntity(grbbrModel.name);
  return baseUrl => row => {
    const formattedRow = basicRowFormatter(row);
    for (let relation of relations) {
      const id = formattedRow[relation.attribute];
      delete formattedRow[relation.attribute];
      formattedRow[relation.as || relation.attribute] = id ? makeRefObj(baseUrl, relation.references, id) : null;
    }
    formattedRow.href = makeBbrHref(baseUrl,grbbrModel.name, formattedRow.id);
    return formattedRow;
  };
};

const toJsonSchema = (grbbrModel) => {
  const relations = getRelationsForEntity(grbbrModel.name);
  const toSchema = attr => {
    let result  = {description: attr.description};
    const relation = relations.find(relation => relation.attribute === attr.name);
    if (relation) {
      result.type =['null', 'object'];
      return [relation.as || attr.name, result];
    } else {
      Object.assign(result, getDefaultSchema(attr.type, attr.name !== 'id'));
      return [attr.name, result];
    }
  };

  const properties = _.object(grbbrModel.attributes.map(toSchema));
  const hrefProperty = {href: {
    type: 'string',
      description: 'URL til objektet'
    }};
  Object.assign(properties, hrefProperty);
  const docOrder = Object.keys(properties);
  return globalSchemaObject({
    properties,
    docOrder
  })
};

const makeJsonRepresentation = (grbbrModel) => {
  return {
    fields: [],
    mapper: createJsonFormatter(grbbrModel),
    schema: toJsonSchema(grbbrModel)
  };
};

const makeRepresentations = grbbrModel => {
  const representations = {
    flat: makeFlatRepresentation(grbbrModel),
    json: makeJsonRepresentation(grbbrModel)
  };
  if (geojsonFields[grbbrModel.name]) {
    const binding = getReplicationBinding(grbbrModel.name, 'current');
    const geometryAttrBinding = getAttributeBinding(geojsonFields[grbbrModel.name], binding);
    addGeojsonRepresentationsUsingBinding(representations, geometryAttrBinding);
  }
  return representations;
};
for (let grbbrModel of grbbrModels) {
  exports[grbbrModel.name] = makeRepresentations(grbbrModel);
  registry.addMultiple(getEntityName(grbbrModel), 'representation', exports[grbbrModel.name]);
}