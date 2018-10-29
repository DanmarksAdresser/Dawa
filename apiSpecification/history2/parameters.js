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
        const specs = specMap[entity];
        if(!specs) {
          return;
        }
        const requestedAttributes = attributeParam.split(',');
        const allSpecifiedAttributes = getAllAttributeNames(specs);
        for(let attr of requestedAttributes) {
          if(!allSpecifiedAttributes.has(attr)) {
            throw `Attributten ${attr} er ikke en gyldig attribut for ${params.entitet}`;
          }
        }
      }
    }]
};