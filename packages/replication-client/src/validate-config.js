const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const _ = require('underscore');
const { go } = require('ts-csp');
const { ReplicationHttpClient } = require('./replication-http-client');
const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'config-schema.json')));
const validateAgainstSchema = (config) => {
  const result = ajv.validate(schema, config);
  if(!result) {
    return [false, ajv.errorsText()];
  }
  else {
    return [true, null];
  }
}

const validateAgainstModel =  (model, config) => {
  const [schemaValid, errorsText] = validateAgainstSchema(config);
  if(!schemaValid) {
    return [false, errorsText];
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

const normalize = config => {
  if(!config.bindings) {
    config.bindings = {};
  }
  // there should be a binding conf for every entity
  for(let entityConf of config.entities) {
    if(!config.bindings[entityConf.name]) {
      config.bindings[entityConf.name] = {};
    }
    const bindingConf = config.bindings[entityConf.name];
    // there should be a table for every entity (default to entity name lowercased)
    if(!bindingConf.table) {
      bindingConf.table = entityConf.name.toLowerCase();
    }
    // there should be attribute bindings
    if(!config.bindings.attributes) {
      bindingConf.attributes = {};
    }
    for(let attrName of entityConf.attributes) {
      if(!bindingConf.attributes[attrName]) {
        bindingConf.attributes[attrName] = {};
      }
      const attrBindingConf = bindingConf.attributes[attrName];
      // every attribute should specify a column name
      if(!attrBindingConf.columnName) {
        attrBindingConf.columnName = attrName.toLowerCase();
      }
    }
  }
  return config;
};

const validateAgainstDatabase = (config, metadata) => {
  for(let [entity, binding] of Object.entries(config.bindings)) {
    const schema = 'public';
    if(!metadata[schema]) {
      return [false, `Database missing schema ${schema}`];
    }
    const table = binding.table;
    const metadataTable = metadata[schema][table];
    if(!metadataTable) {
      return [false, `Database missing table ${schema}.${table} for entity ${entity}`];
    }
    for(let [attrName, attrBinding] of Object.entries(binding.attributes)) {
      const columnName = attrBinding.columnName;
      if(!metadataTable[columnName]) {
        return [false, `Database missing column ${columnName} for attribute ${attrName} of table ${schema}.${table} for entity ${entity}`];
      }
    }
  }
  return [true, null];
};

const getValidatedConfig = (filePath) => go(function* () {
  let fileText;
  try {
    fileText = fs.readFileSync(filePath, {encoding: 'utf-8'});
  }
  catch (e) {
    return [null, new Error(`Could not read file: ${filePath}: ${e.message}`)];
  }
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(fileText);
  }
  catch (e) {
    return [null, new Error(`Configuration file is not valid json: ${e.message}`)];
  }
  const [schemaValid, schemaErrorText] = validateAgainstSchema(parsedConfig);
  if (!schemaValid) {
    return [null, new Error(`Configuration file is not valid: ${schemaErrorText}`)];
  }
  normalize(parsedConfig);
  const httpClient = new ReplicationHttpClient(parsedConfig.replication_url, 200);
  const datamodel = yield httpClient.datamodel();
  const [valid, errorText] = validateAgainstModel(datamodel, parsedConfig);
  if (!valid) {
    return [null, new Error(`Configuration file does not match datamodel: ${errorText}`)];
  }
  return [parsedConfig, null];
});

module.exports = {
  validateAgainstSchema,
  validateAgainstModel,
  normalize,
  getValidatedConfig,
  validateAgainstDatabase
};