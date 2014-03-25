"use strict";

var _ = require('underscore');

exports.checkRequiredOptions = function(options, requiredOptions) {
  var suppliedOptions = _.reduce(options, function(memo, value, key) {
    if(!_.isUndefined(value) && !_.isNull(value)) {
      memo.push(key);
    }
    return memo;
  }, []);
  var missingOptions = _.difference(requiredOptions,suppliedOptions);
  if(missingOptions.length > 0) {
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
};

exports.addEnvironmentOptions = function(parameterSpec, options) {
  _.each(parameterSpec, function(spec, key) {
    if(_.isUndefined(options[key]) || _.isNull(options[key])) {
      var format = spec[2];
      options[key] = exports.parseOptionValue(format, process.env[key]);
    }
  });
};

