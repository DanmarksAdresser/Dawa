const grbbrModels = require('../../ois2/parse-ea-model');
const registry = require('../registry');
const {getEntityName, filterSpecs} = require('./common');
grbbrModels.forEach(grbbrModel => {
  exports[grbbrModel.name] = {
    id: [{
      name: 'id',
      type: 'string'
    }],
    propertyFilter: filterSpecs[grbbrModel.name].map(spec => spec.parameter)
  };
  registry.addMultiple(getEntityName(grbbrModel), 'parameterGroup', exports[grbbrModel.name]);
});