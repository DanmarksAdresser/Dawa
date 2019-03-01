const convict = require('convict');
const { go } = require('ts-csp');
const objectAssignDeep = require(`object-assign-deep`);

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
    for(let override of overrides) {
      if(override[key]) {
        return override[key];
      }
    }
    return convictConfig.get(key);
  }
};
const mergeConfigSchemas = (schemas) => objectAssignDeep({}, ...schemas);

const getConfig = () => config;
const initialize = (schema, configFiles, cmdLineOptions) =>  {
  if(convictConfig) {
    throw new Error('Cannot initialize configuration twice');
  }
  convictConfig = convict(schema);
  for(let file of configFiles) {
    convictConfig.loadFile(file);
  }
  if(cmdLineOptions.config_files) {
    convictConfig.set('config_files', cmdLineOptions.config_files);
  }
  const config_files = convictConfig.get('config_files');
  if(config_files) {
    for(let file of config_files.split(',')) {
      convictConfig.loadFile(file);
    }
  }
  convictConfig.load(cmdLineOptions);
};

const withConfigOverride = (override, fn) => go(function*() {
  overrides.push(override);
  const result = yield fn();
  overrides.pop();
  return result;
});

module.exports = {
  getConfig,
  initialize,
  withConfigOverride,
  mergeConfigSchemas
};

