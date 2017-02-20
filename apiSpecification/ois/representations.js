"use strict";

const _ = require('underscore');

const namesAndKeys = require('./namesAndKeys');
const oisApiModels = require('./oisApiModels');
const oisModels = require('../../ois/oisModels');
const fieldsMap = require('./fields');
const representationUtil = require('../common/representationUtil');
const registry = require('../registry');

const extractNonprefixedEntity = (entity, row) => {
  const fields = oisModels[entity].fields;
  const obj = fields.reduce((memo, field) => {
    memo[field.name] = row[field.name];
    return memo;
  }, {});
  const geomField = _.findWhere(oisModels[entity].derivedFields, { name: 'geom'});
  if(geomField) {
    obj.koordinater =  row.koordinater_x ?
      [row.koordinater_x, row.koordinater_y]
      : null;
  }
  return obj;
};
const extractPrefixedEntity = (entity, row) => {
  const oisModel = oisModels[entity];
  if(row[`${entity}_${oisModel.key[0]}`]) {
    const fields = oisModels[entity].fields;
    const obj = fields.reduce((memo, field) => {
      memo[field.name] = row[`${entity}_${field.name}`];
      return memo;
    }, {});
    const geomField = _.findWhere(oisModels[entity].derivedFields, { name: 'geom'});
    if(geomField) {
      obj.koordinater =  row[`${entity}_koordinater_x`] ?
        [row[`${entity}_koordinater_x`], row[`${entity}_koordinater_y`]] :
        null;
    }
    return obj;
  }
  else {
    return null;
  }
};

const extractAggregateEntity = (entity, row) => {
  const fixFieldCasing = obj => {
    const model = oisModels[entity];
    return model.fields.reduce((memo, field) => {
      memo[field.name] = obj[field.name.toLowerCase()];
      return memo;
    }, {});
  }
  const plural = namesAndKeys[entity].plural;
  const objects =  (row[plural] || []).map(fixFieldCasing);
  const result = {};
  result[plural] = objects;
  return result;
}

const fieldsIncludedInFlatMap = Object.keys(oisApiModels).reduce((memo, apiModelName) => {
  const excludedFields = ['geom_json'];

  const allFields = fieldsMap[apiModelName];
  memo[apiModelName] = representationUtil.fieldsWithoutNames(allFields, excludedFields);
  return memo;
}, {});

for(let apiModelName of Object.keys(oisApiModels)) {
  const apiModel = oisApiModels[apiModelName];
  const flatFields = fieldsIncludedInFlatMap[apiModelName];
  const flatRepresentation = representationUtil.defaultFlatRepresentation(flatFields);
  const miniFieldNames = _.pluck(oisModels[apiModelName].fields, 'name');
  const miniFields = _.filter(flatFields, field => _.contains(miniFieldNames, field.name));

  const miniRepresentation = representationUtil.defaultFlatRepresentation(miniFields);


  const jsonMapper = baseUrl => row => {
    let result = extractNonprefixedEntity(apiModel.primaryRelation, row);
    for(let secondaryRelation of apiModel.secondaryRelations) {
      if(!secondaryRelation.aggregate) {
        result[secondaryRelation.relationName] =
          extractPrefixedEntity(secondaryRelation.relationName, row);
      }
      else {
        result = Object.assign(result, extractAggregateEntity(secondaryRelation.relationName, row));
      }
    }
    return result;
  };

  const representations = {
    flat: flatRepresentation,
    json: {
      fields: fieldsIncludedInFlatMap[apiModelName],
      mapper: jsonMapper
    },
    mini: miniRepresentation
  };

  if(apiModel.geojson) {
    const geojsonField = _.findWhere(fieldsMap[apiModelName], {name: 'geom_json'});
    representations.geojson = representationUtil.geojsonRepresentation(geojsonField, representations.flat);
    representations.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, representations.json);
    representations.geojsonMini=representationUtil.geojsonRepresentation(geojsonField, miniRepresentation);
  }
  exports[apiModelName] = representations;
  registry.addMultiple(`ois_${apiModelName}`, 'representation', representations);
}
