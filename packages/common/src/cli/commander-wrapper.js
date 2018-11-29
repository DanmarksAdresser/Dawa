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

const addOptionsFromEnvironment = (optionSpecs, options) => {
  optionSpecs.forEach(({name, type}) => {
    if(_.isUndefined(options[name] || options[name] === null)) {
      options[name] = parsers[type](process.env[name]);
    }
  });
};

const addDefaults = (optionSpecs, options) => {
  optionSpecs.forEach(({name, defaultValue}) => {
    if(_.isUndefined(options[name] || options[name] === null)) {
      if(existy(defaultValue)) {
        options[name] = defaultValue;
      }
    }
  });
};

const checkRequiredOptions = (optionSpecs, options) => {
  optionSpecs.forEach(({name, required}) => {
    if(required && !existy(options[name])) {
      /* eslint no-console : 0 */
      console.error(`Missing required argument --${name}`);
      process.exit(1);
    }
  });
};

const parseProgramArguments = (optionSpecs) => {
  optionSpecs = _.clone(optionSpecs);
  optionSpecs.push(configOption);
  optionSpecs.push(logConfigOption);
  const program = optionSpecs.reduce((acc, {name, type, description}) => {
    const argumentString = type === 'boolean' ? `--${name}` : `--${name} <value>`;
    return commander.option(argumentString, description, parsers[type]);
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

const parseCommands = (commandSpecs, args) => {
  const result = {};
  const program = commander;
  for(let command of commandSpecs) {
    const cmd = program.command(command.name);
    for(let {name, description, type} of command.parameters) {
      const argumentString = type === 'boolean' ? `--${name}` : `--${name} <value>`;
      cmd.option(argumentString, description, parsers[type]);
    }
    cmd.action((parseResult) => {
      result.command = command.name;
      result.options = parseResult.opts();
    });
  }
  program.parse(args);
  return result;
};

module.exports = {
  parseProgramArguments,
  parseCommands
};