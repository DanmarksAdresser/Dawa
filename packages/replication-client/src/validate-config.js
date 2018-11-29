const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const _ = require('underscore');

const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'config-schema.json')))
module.exports = (model, config) => {
  const result = ajv.validate(schema, config);
  if(!result) {
    return [false, ajv.errorsText()];
  }
  for(let configEntity of config.entities) {
    const modelEntity = model[configEntity.name];
    if(!modelEntity) {
      return [false, `Entity ${configEntity.name} specified in configuration file was not found in datamodel.`];
    }
    const modelAttributeNames = _.pluck(modelEntity.attributes, "name");
    for(let attrName of configEntity.attributes) {
      if(!modelAttributeNames.includes(attrName)) {
        return [false, `Attribute ${attrName} of entity ${configEntity.name} specified in configuration was not found in datamodel.`];
      }
    }
  }
  return [true, null];
};