const _ = require('underscore');

const schema = require('../parameterSchema');
const specMap = require('./spec');
const replikeringDatamodels = require('../replikering/datamodel');

const getAllAttributeNames = (specs) => {
  return specs.reduce((acc, spec) => {
    const excludedColumns = ['rowkey', 'virkningstart', 'virkningslut', ...(spec.excluded || [])];
    const model = replikeringDatamodels[spec.entity];
    _.pluck(model.attributes, 'name')
      .filter(attName => !excludedColumns.includes(attName))
      .map(attr => `${spec.alias}_${attr}`)
      .forEach(attr => acc.add(attr));
    return acc;
  }, new Set());
};
module.exports = {
  id: [{
    name: 'id',
    type: 'string',
    schema: schema.uuid,
    required: true
  }],
  entity: [{
    name: 'entitet',
    type: 'string',
    schema: {
      enum:['navngivenvej', 'husnummer', 'adresse']
    },
    required: true
  }],
  attributes: [
    {
      name: 'attributter',
      type: 'string',
      validateFun: (attributeParam, params) => {
        const entity = params.entitet;
        if(!entity) {
          return;
        }
        const entities = specMap[entity].entities;
        if(!entities) {
          return;
        }
        const requestedAttributes = attributeParam.split(',');
        const derivedAttrNames = _.pluck(specMap[entity].derivedFields, 'fieldName');
        const allSpecifiedAttributes = getAllAttributeNames(entities);
        for(let attr of derivedAttrNames) {
          allSpecifiedAttributes.add(attr);
        }
        for(let attr of requestedAttributes) {
          if(!allSpecifiedAttributes.has(attr)) {
            throw `Attributten ${attr} er ikke en gyldig attribut for ${params.entitet}`;
          }
        }
      }
    }]
};