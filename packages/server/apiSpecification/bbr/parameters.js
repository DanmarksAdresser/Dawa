const grbbrModels = require('../../ois2/parse-ea-model');
const registry = require('../registry');
const {getEntityName, filterSpecs} = require('./common');
const commonSchemaDefinitions = require('../commonSchemaDefinitions');
grbbrModels.forEach(grbbrModel => {
  exports[grbbrModel.name] = {
    id: [{
      name: 'id',
      type: 'string',
      schema: commonSchemaDefinitions.UUID
    }],
    propertyFilter: filterSpecs[grbbrModel.name].map(spec => spec.parameter)
  };
  registry.addMultiple(getEntityName(grbbrModel), 'parameterGroup', exports[grbbrModel.name]);
});
console.dir(exports.bygning);