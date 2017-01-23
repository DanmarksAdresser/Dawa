"use strict";

const oisApiModels = require('./oisApiModels');
const oisModels = require('../../ois/oisModels');
const namesAndKeys = require('./namesAndKeys');
const schemas = require('./schemas');

const fieldsFromSecondaryRelation = secondaryRelation => {
  const oisFields = oisModels[secondaryRelation.relationName].fields;

  return oisFields.map(field => (

  {
    name: `${secondaryRelation.relationName}_${field.name}`,
    schema: schemas.schemaFromField(field, true),
    source: {
      relation: secondaryRelation.relationName,
      name: field.name
    }
  }));
};


const fields =  apiModelName => {
  const apiModel = oisApiModels[apiModelName];
  const primaryFields = oisModels[apiModel.primaryRelation].fields;

  const secondaryNonaggregateFields = apiModel.secondaryRelations.filter(rel => !rel.aggregate)
    .map(fieldsFromSecondaryRelation)
    .reduce((memo, fields) => memo.concat(fields), []);

  const secondaryAggregateFields = apiModel.secondaryRelations.filter(rel=>rel.aggregate).map(rel => {
    return {
      name: namesAndKeys[rel.relationName].plural,
      multi: true
    }
  });
  const result = primaryFields.concat(secondaryNonaggregateFields).concat(secondaryAggregateFields);
  if(apiModel.geojson) {
    result.push({
      name: 'geom_json'
    });
  }
  return result;
};


for(let apiModelName of Object.keys(oisApiModels)) {
  exports[apiModelName] = fields(apiModelName);
}
