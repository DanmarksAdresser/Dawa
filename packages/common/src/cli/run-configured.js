const configHolder = require('../config/holder');
const logger = require('../logger');
module.exports = (convictSchema, configFiles, fn) => {
  convictSchema = configHolder.mergeConfigSchemas([require('../config/base-schema'), convictSchema]);
  const parsers = {
    '*': str => str,
    boolean: b => b,
    number: parseFloat,
    int: parseInt,
    nat: parseInt
  };

  const cliSchema = Object.entries(convictSchema).reduce((acc, [key, value]) => {
    if (value.cli) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const program = require('commander');
  for (let key of Object.keys(cliSchema)) {
    const schema = convictSchema[key];
    const argumentString = schema.format === 'boolean' ? `--${key}` : `--${key} <value>`;
    const parser = parsers[schema.format];
    program.option(argumentString, schema.doc, parser);
  }

  program.parse(process.argv);

  const cliOptions = Object.keys(cliSchema).reduce((acc, name) => {
    if (typeof program[name] !== 'undefined') {
      acc[name] = program[name];
    }
    return acc;
  }, {});

  configHolder.initialize(convictSchema, configFiles, cliOptions);
  const config = configHolder.getConfig();
  logger.initialize(config.get('logging'));
  const result = fn(config);
  if (result && result.asPromise) {
    result.asPromise().done();
  }
};