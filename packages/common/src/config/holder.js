const convict = require('convict');
const {go} = require('ts-csp');
const objectAssignDeep = require(`object-assign-deep`);
const  assert = require('assert');
/**
 * This module provides access to the global configuration. It should be inialized *once* during application startup.
 *
 * Support for temporarily overriding configuration parameters is for testing purposes only.
 * @type {null}
 */

let convictConfig = null;
const overrides = [];


const config = {
  get: key => {
    for (let override of overrides) {
      if (override[key]) {
        return override[key];
      }
    }
    return convictConfig.get(key);
  }
};

const mergeConfigSchemas = (schemas) => objectAssignDeep({}, ...schemas);

const flattenSchema = schema => {
  const doFlatten = (prefix, schema) =>
    Object.entries(schema).reduce((acc, [key, value]) => {
      if (value.format) {
        acc[prefix + key] = value;
      } else {
        Object.assign(acc, doFlatten(prefix + key + '.', value));
      }
      return acc;
    }, {});
  return doFlatten('', schema);
};

const checkRequired = (schema, convictConfig) => {
  const flattened = flattenSchema(schema);
  for(let [key, schemaVal] of Object.entries(flattened)) {
    if(schemaVal.required) {
      assert(convictConfig.has(key) && convictConfig.get(key) !== null && !convictConfig.get(key).format);
    }
  }
};

const getConfig = () => config;
const initialize = (schema, configFiles, cmdLineOptions) => {
  if (convictConfig) {
    throw new Error('Cannot initialize configuration twice');
  }
  convict.addFormat({
    name: 'string',
    validate: val => val === null || typeof val === 'string'
  });
  convict.addFormat({
    name: 'boolean',
    validate: val => typeof val === 'boolean'
  });

  convictConfig = convict(schema);

  for (let file of configFiles) {
    convictConfig.loadFile(file);
  }
  if (cmdLineOptions.config_files) {
    convictConfig.set('config_files', cmdLineOptions.config_files);
  }
  const config_files = convictConfig.get('config_files');
  if (config_files) {
    for (let file of config_files.split(',')) {
      convictConfig.loadFile(file);
    }
  }
  convictConfig.load(cmdLineOptions);
  convictConfig.validate();
  checkRequired(schema, convictConfig);

};


const withConfigOverride = (override, fn) => go(function* () {
  overrides.push(override);
  const result = yield fn();
  overrides.pop();
  return result;
});

module.exports = {
  getConfig,
  initialize,
  withConfigOverride,
  mergeConfigSchemas,
  flattenSchema,
  checkRequired
};

