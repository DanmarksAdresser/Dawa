"use strict";

const _ = require('underscore');

const oisApiModels = require('./oisApiModels');
const fullOisModels = require('../../ois/oisModels');
const publicOisModels = require('../../ois/publicOisModels');
const namesAndKeys = require('./namesAndKeys');
const schemas = require('./schemas');

const oisModelsMap = {
  'public': publicOisModels,
  full: fullOisModels
};

const fieldsFromSecondaryRelation = (oisModels, secondaryRelation) => {
  const oisModel = oisModels[secondaryRelation.relationName];
  const oisFields = oisModel.fields;
  const regularFields = oisFields.map(field => (

    {
      name: `${secondaryRelation.relationName}_${field.name}`,
      schema: schemas.schemaFromField(field, true),
      source: {
        relation: secondaryRelation.relationName,
        name: field.name
      }
    }));

  const geomField = _.findWhere(oisModel.derivedFields, {name: 'geom'});
  const coordinateFields = geomField ?
    [{
      name: `${secondaryRelation.relationName}_koordinater_x`,
      source: {
        relation: secondaryRelation.relationName,
        name: 'koordinater_x'
      }
    },
      {
        name: `${secondaryRelation.relationName}_koordinater_y`,
        source: {
          relation: secondaryRelation.relationName,
          name: 'koordinater_y'
        }
      }] : [];

  return regularFields.concat(coordinateFields);
};

const fieldsFromPrimaryRelation = oisModel => {
  const regularFields = oisModel.fields;
  const geomField = _.findWhere(oisModel.derivedFields, {name: 'geom'});
  const coordinateFields = geomField ?
    [{
      name: `koordinater_x`
    },
      {
        name: `koordinater_y`
      }] : [];

  return regularFields.concat(coordinateFields);
};


const fields = (oisModels, apiModelName) => {
  const apiModel = oisApiModels[apiModelName];
  const primaryFields = fieldsFromPrimaryRelation(oisModels[apiModel.primaryRelation]);

  const secondaryNonaggregateFields = apiModel.secondaryRelations.filter(rel => !rel.aggregate)
    .map(secondaryRelation => fieldsFromSecondaryRelation(oisModels, secondaryRelation))
    .reduce((memo, fields) => memo.concat(fields), []);

  const secondaryAggregateFields = apiModel.secondaryRelations.filter(rel => rel.aggregate).map(rel => {
    return {
      name: namesAndKeys[rel.relationName].plural,
      multi: true
    }
  });
  const result = primaryFields.concat(secondaryNonaggregateFields).concat(secondaryAggregateFields);
  if (apiModel.geojson) {
    result.push({
      name: 'geom_json'
    });
  }
  return result;
};

for(let variant of ['public', 'full']) {
  const oisModels = oisModelsMap[variant];
  exports[variant]= {};
  for (let apiModelName of Object.keys(oisApiModels)) {
    exports[variant][apiModelName] = fields(oisModels, apiModelName);
  }
}
