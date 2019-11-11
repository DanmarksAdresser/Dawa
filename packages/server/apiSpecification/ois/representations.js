"use strict";

const _ = require('underscore');

const namesAndKeys = require('./namesAndKeys');
const oisApiModels = require('./oisApiModels');
const fullOisModels = require('../../ois/oisModels');
const fieldsMap = require('./fields');
const representationUtil = require('../common/representationUtil');
const registry = require('../registry');

const oisModelsMap = {
  full: fullOisModels,
  public: fullOisModels
};

const makeOisHref = (baseUrl, variant, apiModelName, id) => {
  const path = variant === 'full' ? '/ois' : '/bbrlight';
  return `${baseUrl}${path}/${namesAndKeys[apiModelName].plural}/${id}`;
};

const extractNonprefixedEntity = ( model, row) => {
  const fields = model.fields;
  const obj = fields.reduce((memo, field) => {
    memo[field.name] = row[field.name];
    return memo;
  }, {});
  const geomField = _.findWhere(model.derivedFields, { name: 'geom'});
  if(geomField) {
    obj.koordinater =  row.koordinater_x ?
      [row.koordinater_x, row.koordinater_y]
      : null;
  }
  return obj;
};
const extractPrefixedEntity = (variant, oisModels, baseUrl, entity, row) => {
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
    obj.href = makeOisHref(baseUrl, variant, entity, row[`${entity}_${oisModel.key[0]}`]);
    return obj;
  }
  else {
    return null;
  }
};

const extractAggregateEntity = (oisModels, entity, row) => {
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
};

const fieldsIncludedInFlatMap =  variant => {
  return Object.keys(oisApiModels).reduce((memo, apiModelName) => {
    const excludedFields = ['geom_json'];

    const allFields = fieldsMap[variant][apiModelName];
    memo[apiModelName] = representationUtil.fieldsWithoutNames(allFields, excludedFields);
    return memo;
  }, {});
};

const createRepresentations = variant => {
  exports[variant] = {};
  const oisModels = oisModelsMap[variant];
  for(let apiModelName of Object.keys(oisApiModels)) {
    const apiModel = oisApiModels[apiModelName];
    const flatFields = fieldsIncludedInFlatMap(variant)[apiModelName];
    const flatRepresentation = representationUtil.defaultFlatRepresentation(flatFields);
    const miniFieldNames = _.pluck(oisModels[apiModelName].fields, 'name');
    const miniFields = _.filter(flatFields, field => _.contains(miniFieldNames, field.name));

    const miniRepresentation = representationUtil.defaultFlatRepresentation(miniFields);


    const jsonMapper = baseUrl => row => {
      let result = extractNonprefixedEntity(oisModels[apiModel.primaryRelation], row);
      if(apiModelName !== 'matrikelreference') {
        result.href = makeOisHref(baseUrl, variant, apiModelName, row[oisModels[apiModel.primaryRelation].key[0]]);
      }
      for(let secondaryRelation of apiModel.secondaryRelations) {
        if(!secondaryRelation.aggregate) {
          result[secondaryRelation.relationName] =
            extractPrefixedEntity(variant, oisModels, baseUrl, secondaryRelation.relationName, row);
        }
        else {
          result = Object.assign(result, extractAggregateEntity(oisModels, secondaryRelation.relationName, row));
        }
      }
      return result;
    };

    const representations = {
      flat: flatRepresentation,
      json: {
        fields: fieldsIncludedInFlatMap(variant)[apiModelName],
        mapper: jsonMapper
      },
      mini: miniRepresentation
    };

    if(apiModel.geojson) {
      const geojsonField = _.findWhere(fieldsMap[variant][apiModelName], {name: 'geom_json'});
      representations.geojson = representationUtil.geojsonRepresentation(geojsonField, representations.flat);
      representations.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, representations.json);
      representations.geojsonMini=representationUtil.geojsonRepresentation(geojsonField, miniRepresentation);
    }
    exports[variant][apiModelName] = representations;
    registry.addMultiple(`ois_${apiModelName}_${variant}`, 'representation', representations);
  }
};

for(let variant of ['full', 'public']) {
  createRepresentations(variant);
}
