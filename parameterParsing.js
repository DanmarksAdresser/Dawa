"use strict";

var ZSchema     = require("z-schema");
var _           = require('underscore');
//var winston     = require('winston');

/******************************************************************************/
/*** Parameter parsing and validation *****************************************/
/******************************************************************************/

exports.parseParameters = function(params, parameterSpec) {
  _.each(_.keys(parameterSpec),
         function(name){
           if (!params[name] && parameterSpec[name].defaultValue !== undefined){
             params[name] = parameterSpec[name].defaultValue;
           }
         });
  var paramNames = _.filter(_.keys(params), function(name) {
    return parameterSpec[name] ? true : false;
  });
  var parsedParameters = _.reduce(paramNames,
    function(memo, name){
      try{
        var val = parseParameterMulti(params[name], parameterSpec[name]);
        var parsedName = parameterSpec[name].renameTo || name;
        memo.params[parsedName] = val;
      } catch(error){
        memo.errors.push([name, error]);
      }
      return memo;
    },
    {params: {}, errors: []});
  return parsedParameters;
};

exports.validateParameters = function(params, parameterSpec) {
    var validationErrors = _.reduce(params, function(memo, paramValue, paramKey) {
      var spec = parameterSpec[paramKey];
      if(spec && spec.validateFun) {
        try {
          if(spec.multi) {
            _.each(paramValue.values, function(value) {
              spec.validateFun(value, params);
            });
          }
          else {
            spec.validateFun(paramValue, params);
          }
        }
        catch(error) {
          memo.push([paramKey, error]);
        }
      }
      return memo;
    },[]);
  var missingRequiredErrors = _.reduce(parameterSpec, function(memo, spec) {
    if(spec.required && params[spec.name] === undefined) {
      memo.push([spec.name, 'Parameteren '+ spec.name + ' skal angives']);
    }
    return memo;
  }, []);
  return validationErrors.concat(missingRequiredErrors);
};

function parseParameterMulti(valString, paramSpec) {
  if (paramSpec.multi === true)
  {
    return {_multi_: true,
            values: _.map(valString.split('|'), function(str){ return parseParameter(str, paramSpec); })};
  }
  else
  {
    return parseParameter(valString, paramSpec);
  }
}

function parseParameter(valString, paramSpec) {
  var val = parseParameterType(valString, paramSpec.type);
  jsonSchemaValidation(val, paramSpec.schema);
  return val;
}

function parseParameterType(valString, type) {
  if(valString === '') {
    return null;
  }
  if (type === undefined || type === 'string') {
    return valString;
  }
  if(type === 'integer') {
    if(!/^[0-9]+$/.test(valString)) {
      throw 'notInteger';
    }
    return parseInt(valString, 10);
  }
  if(type === 'float') {
    if(!/^(\-|\+)?[0-9]+(\.[0-9]+)?$/.test(valString)) {
      throw 'notFloat';
    }
    return parseFloat(valString);
  }
  if(type === 'boolean') {
    if(valString === 'true') {
      return true;
    }
    else if (valString === 'false') {
      return false;
    }
    else {
      throw 'notBoolean';
    }
  }
  if(type === 'json') {
    try {
      return JSON.parse(valString);
    }
    catch(error) {
      throw 'notJson';
    }
  }
  // This code does not really belong here. Perhaps a type class with parse function would work better.
  if(type === 'zone') {
    if(valString.toUpperCase() === 'BYZONE') {
      return 1;
    }
    if(valString.toUpperCase() === 'SOMMERHUSOMRÅDE') {
      return 2;
    }
    if(valString.toUpperCase() === 'LANDZONE') {
      return 3;
    }
    throw 'zone skal være enten Byzone, Sommerhusområde eller Landzone';
  }

  throw 'Internal error: Invalid type ' + type + ' specified for parameter';
}

function jsonSchemaValidation(val, schema){
  if (schema){
    try{
      zsValidate(val, schema);
    }
    catch(errors){
      throw errors[0].message;
    }
  }
}

var validator = new ZSchema();
function zsValidate(json, schema){
  var valid = validator.validate(json, schema);
  if (!valid) {
    throw validator.getLastErrors();
  } else {
    return true;
  }
}
