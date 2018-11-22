"use strict";

var cli = require('cli');
var fs = require('fs');
var q = require('q');
var _ = require('underscore');

var logger = require('../logger');

exports.checkRequiredOptions = function(options, requiredOptions) {
  var suppliedOptions = _.reduce(options, function(memo, value, key) {
    if(!_.isUndefined(value) && !_.isNull(value)) {
      memo.push(key);
    }
    return memo;
  }, []);
  var missingOptions = _.difference(requiredOptions,suppliedOptions);
  if(missingOptions.length > 0) {
    /*eslint no-console: 0 */
    console.error('Missing required options: ' + JSON.stringify(missingOptions));
    process.exit(1);
  }
};

exports.parseOptionValue = function(format, value) {
  if(_.isUndefined(value)) {
    return undefined;
  }
  if(format === 'string') {
    return value;
  }
  if(format === 'number') {
    return parseFloat(value);
  }
  if(format === 'boolean' || format === 'bool') {
    if(value === undefined || value === null) {
      return value;
    }
    return value.toLowerCase() === 'true';
  }
};

exports.addFileOptions = function(parameterSpec, options) {
  var file = options.configurationFile;
  if(file) {
    var configuration = JSON.parse(fs.readFileSync(file));
    _.each(parameterSpec, function(spec, key) {
      if( configuration[key] !== undefined && (_.isUndefined(options[key]) || _.isNull(options[key]) || options[key] === spec[3])) {
        var format = spec[2];
        options[key] = exports.parseOptionValue(format, configuration[key]);
      }
    });
  }
};

exports.addEnvironmentOptions = function(parameterSpec, options) {
  _.each(parameterSpec, function(spec, key) {
    if(_.isUndefined(options[key]) || _.isNull(options[key])) {
      var format = spec[2];
      options[key] = exports.parseOptionValue(format, process.env[key]);
    }
  });
};

exports.addFileAndEnvironmentOptions = function(parameterSpec, options) {
  exports.addFileOptions(parameterSpec, options);
  exports.addEnvironmentOptions(parameterSpec, options);
};

exports.addConfigurationFileParameter = function(optionSpec) {
  optionSpec.configurationFile = [false, 'Konfigurationsfil med yderligere parametre', 'string'];
};

exports.addLogOptionsParameter = function(optionSpec) {
  optionSpec.logConfiguration = [false, 'Konfigurationsfil med logkonfiguration', 'string'];
};

exports.main = function(optionSpec, requiredParams, mainFunc) {
  q.longStackSupport = true;
  optionSpec = _.clone(optionSpec);
  exports.addConfigurationFileParameter(optionSpec);
  exports.addLogOptionsParameter(optionSpec);
  cli.parse(optionSpec);


  cli.main(function(args, options) {
    var logOptions;
    if (options.logConfiguration) {
      var logOptionsStr = fs.readFileSync(options.logConfiguration);
      logOptions = JSON.parse(logOptionsStr);
    }
    else {
      logOptions = {};
    }
    logger.initialize(logOptions);

    options.logOptions = logOptions;
    exports.addFileAndEnvironmentOptions(optionSpec, options);
    exports.checkRequiredOptions(options, requiredParams);
    mainFunc(args, options);
  });
};

exports.mainMandatory = function(optionSpec, mainFunc) {
  exports.main(optionSpec, _.keys(optionSpec), mainFunc);
};
