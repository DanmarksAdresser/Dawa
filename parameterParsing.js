"use strict";

var ZSchema     = require("z-schema");
var _           = require('underscore');
//var winston     = require('winston');

/******************************************************************************/
/*** Parameter parsing and validation *****************************************/
/******************************************************************************/

exports.parseParameters = function(params, parameterSpec) {
  var paramNames = _.filter(_.keys(params), function(name) {
    return parameterSpec[name] ? true : false;
  });
  return _.reduce(paramNames,
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
};

function parseParameterMulti(valString, paramSpec) {
  if (paramSpec.multi === true)
  {
    return _.map(valString.split('|'), function(str){ return parseParameter(str, paramSpec); });
  }
  else
  {
    return parseParameter(valString, paramSpec);
  }
}

function parseParameter(valString, paramSpec) {
  var val = parseParameterType(valString, paramSpec.type);
  jsonSchemaValidation(val, paramSpec.schema);
  if (paramSpec.validateFun) {
    paramSpec.validateFun(val);
  }
  return val;
}

function parseParameterType(valString, type) {
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
  if(type === 'json') {
    try {
      return JSON.parse(valString);
    }
    catch(error) {
      throw 'notJson';
    }
  }
  throw 'Internal error: Invalid type ' + type + ' specified for parameter';
}

function jsonSchemaValidation(val, schema){
  if (schema){
    try{
      zsValidate(val, schema);
    }
    catch(error){
      throw error.errors[0].message;
    }
  }
}

var validator = new ZSchema({ sync: true });
function zsValidate(json, schema){
  var valid = validator.validate(json, schema);
  if (!valid) {
    throw validator.getLastError();
  } else {
    return true;
  }
}
