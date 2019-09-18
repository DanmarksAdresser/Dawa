const indices = require('../../ois2/indices');
const relations = require('../../ois2/relations');
const grbbrModels = require('../../ois2/parse-ea-model');

grbbrModels.forEach(grbbrModel => {
  const indexedAttrNames = ['id', 'status', 'kommunekode', ...indices.filter(index => index.entity === grbbrModel.name).map(index => index.columns[0])];
  const toParameter = attributeName => {
    const grbbrAttribute = grbbrModel.attributes.find(attr => attr.name === attributeName);
    const relation = relations.getRelation(grbbrModel.name, attributeName);
    return {
      name: relation ? `${grbbrAttribute.name}_id` : grbbrAttribute.name,
      type: grbbrAttribute.type === 'integer' ? 'integer' : 'string',
      multi: true
    };
  };
  exports[grbbrModel.name] = {
    id: [{
      name: 'id',
      type: 'string'
    }],
    propertyFilter: indexedAttrNames.map(toParameter)
  };
});