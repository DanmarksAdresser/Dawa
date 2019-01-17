"use strict";

const commander = require('commander');
const fs = require('fs');
const _ = require('underscore');

const logger = require('../logger');

const existy =val => !_.isUndefined(val) && val !== null;

const configOption = {
  name: 'config',
  description: 'Configuration file with additional configuration properties',
  type: 'string',
  required: false
};

const logConfigOption = {
  name: 'log-config',
  description: 'Logging configuration file',
  type: 'string',
  required: false
};

const parsers = {
  string: str => str,
  boolean: b => b,
  number: parseFloat,
  integer: parseInt
};

const multiValuedParser = type => value => {
  const singleValueParser = parsers[type];
  return value.split(',').map(singleValueParser);
};

const addOptionsFromEnvironment = (optionSpecs, options) => {
  optionSpecs.forEach(({name, type}) => {
    if(_.isUndefined(options[name] || options[name] === null)) {
      options[name] = parsers[type](process.env[name]);
    }
  });
};

const addDefaults = (optionSpecs, options) => {
  optionSpecs.forEach(({name, defaultValue}) => {
    const optionName = toCamelCase(name);
    if(!existy(options[optionName]) && existy(defaultValue)) {
      options[optionName] = defaultValue;
    }
  });
};

const toCamelCase = str => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase() );

const checkRequiredOptions = (optionSpecs, options) => {
  for(let {name, required} of optionSpecs) {
    const optionName = toCamelCase(name);
    if(required && !existy(options[optionName])) {
      return [false, name];
    }
  }
  return [true];
};

const parseProgramArguments = (optionSpecs) => {
  optionSpecs = _.clone(optionSpecs);
  optionSpecs.push(configOption);
  optionSpecs.push(logConfigOption);
  const program = optionSpecs.reduce((acc, {name, type, description, multiValued}) => {
    const argumentString = type === 'boolean' ? `--${name}` : `--${name} <value>`;
    const parser = multiValued ? multiValuedParser(type) : parsers[type];
    return commander.option(argumentString, description, parser);
  }, commander).parse(process.argv);
  const options = Object.keys(optionSpecs).reduce((acc, {name}) => {
    acc[name] = program[name];
    return acc;
  }, {});
  addOptionsFromEnvironment(optionSpecs, options);
  addDefaults(optionSpecs, options);
  checkRequiredOptions(optionSpecs, options);

  let logOptions;
  if (options.logConfiguration) {
    const logOptionsStr = fs.readFileSync(options.logConfiguration);
    logOptions = JSON.parse(logOptionsStr);
  }
  else {
    logOptions = {};
  }
  logger.initialize(logOptions);

  options.logOptions = logOptions;
  return options;
};

const parseCommands = (commandSpecs, args, version) => {
  /* eslint no-console: 0 */
  const result = {};
  const program = commander;
  program.version(version, '-v, --version');
  for(let command of commandSpecs) {
    const cmd = program.command(command.name).description(command.description);
    for(let {name, description, type, multiValued} of command.parameters) {
      let argumentString = `--${name}`;
      if(type !== 'boolean'){
        argumentString += ` [value]`
      }
      const parser = multiValued ? multiValuedParser(type) : parsers[type];
      cmd.option(argumentString, description, parser);
    }
    cmd.action((parseResult) => {
      if(!parseResult.opts) {
        console.error('Invalid parameter: %s', parseResult);
        process.exit(1);

      }
      result.command = command.name;
      result.options = parseResult.opts();
      const [hasRequiredOptions ,missingOption] = checkRequiredOptions(command.parameters, result.options);
      if(!hasRequiredOptions) {
        console.error(`Error: Missing required option --${missingOption}`);
        parseResult.help();
        process.exit(1);
      }
      const commandSpec = _.findWhere(commandSpecs, {name: result.command});
      addDefaults(commandSpec.parameters, result.options);
    });
  }
  program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });
  program.parse(args);
  if(!result.command) {
    program.help();
    process.exit(1);
  }
  return result;
};

module.exports = {
  parseProgramArguments,
  parseCommands
};